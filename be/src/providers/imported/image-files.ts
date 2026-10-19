import { createHash } from "node:crypto";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import writeFileAtomic from "write-file-atomic";

import { AppError } from "../../domain/app-error.ts";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

export function imageError(code: string, message: string): AppError {
  return new AppError({ code, message, errorKind: "needs_user" });
}

export async function containedFile(root: string, relative: string): Promise<string> {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    throw imageError("IMAGE_PATH_INVALID", "Use a relative file inside the image inbox.");
  }
  const realRoot = await fs.realpath(root);
  const resolved = await fs.realpath(path.resolve(root, relative));
  if (!resolved.startsWith(realRoot + path.sep)) {
    throw imageError("IMAGE_PATH_INVALID", "Image path escapes its permitted directory.");
  }
  return resolved;
}

export async function readStagedImage(inbox: string, relative: string) {
  try {
    const file = await containedFile(inbox, relative);
    const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    let bytes: Buffer;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size === 0 || stat.size > MAX_BYTES) {
        throw imageError("IMAGE_INVALID", "Use a static PNG, JPEG or WebP up to 20 MiB and 25 megapixels.");
      }
      // Bound the read even if another process grows the staged file after stat().
      const buffer = Buffer.alloc(stat.size + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead !== stat.size) throw imageError("IMAGE_CHANGED", "Staged image changed while being read. Retry after copying finishes.");
      bytes = buffer.subarray(0, bytesRead);
    } finally { await handle.close(); }
    const decoder = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "warning" });
    const metadata = await decoder.metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
      throw imageError("IMAGE_INVALID", "Only static PNG, JPEG and WebP images are supported.");
    }
    // APNG's acTL is not exposed as pages by every libvips version.
    if (metadata.format === "png") {
      for (let offset = 8; offset + 12 <= bytes.length;) {
        const length = bytes.readUInt32BE(offset);
        if (bytes.toString("ascii", offset + 4, offset + 8) === "acTL") {
          throw imageError("IMAGE_INVALID", "Animated PNG images are not supported.");
        }
        offset += length + 12;
      }
    }
    // Force full decoding to reject corrupt/truncated images. Preserve the original bytes
    // (including provenance metadata); account for EXIF orientation as browsers do.
    await decoder.stats();
    const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    return { bytes, width, height, extension: metadata.format === "jpeg" ? "jpg" : metadata.format,
      checksum: createHash("sha256").update(bytes).digest("hex") };
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw new AppError({ code: "IMAGE_INVALID", errorKind: "needs_user",
      message: "Image is missing, unreadable, corrupt or exceeds the image limits.", cause });
  }
}

export async function persistImage(assetsRoot: string, file: string, bytes: Buffer): Promise<void> {
  const destination = path.join(assetsRoot, file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const realAssets = await fs.realpath(assetsRoot);
  const realParent = await fs.realpath(path.dirname(destination));
  if (!realParent.startsWith(realAssets + path.sep)) throw imageError("IMAGE_PATH_INVALID", "Asset directory escapes project assets.");
  await writeFileAtomic(destination, bytes);
}

export async function assetExists(assetsRoot: string, file: string | undefined): Promise<boolean> {
  if (!file) return false;
  try { return (await fs.stat(await containedFile(assetsRoot, file))).isFile(); }
  catch { return false; } // Readiness treats missing or escaped assets as absent, never usable.
}

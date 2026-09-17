import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { path as ffprobePath } from "@ffprobe-installer/ffprobe";

const execFileAsync = promisify(execFile);

/** Measures a real audio file's duration in whole milliseconds via ffprobe (already a project
 * dependency, task 002) — never trusts a provider-reported duration, since `durationMs` drives
 * this project's scene-timing math end to end (../../.claude/rules/video.md). */
export async function measureAudioDurationMs(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  if (Number.isNaN(seconds)) {
    throw new Error(
      `measure-audio-duration: ffprobe returned a non-numeric duration for ${filePath}`,
    );
  }
  return Math.round(seconds * 1000);
}

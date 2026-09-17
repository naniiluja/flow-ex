import { deflateSync } from "node:zlib";

/** Tiny hand-rolled PNG/WAV encoders so the fake providers can hand the real render pipeline
 * (task 002's `renderVideo`) genuinely decodable image/audio bytes, without depending on ffmpeg
 * or any external tool (same technique as be/src/render/fixtures/generate-fixtures.mjs, kept as
 * its own small copy here since that script is a one-off task-002 dev utility, not a runtime
 * dependency this package should import). */

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    const tableEntry = CRC32_TABLE[(crc ^ byte) & 0xff];
    if (tableEntry === undefined) {
      throw new Error("synthetic-media: unreachable, index is always within the 256-entry table");
    }
    crc = tableEntry ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function makeSolidColorPng(width: number, height: number, color: RgbColor): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  const ihdr = pngChunk("IHDR", ihdrData);

  const rowBytes = width * 3;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = color.r;
      raw[px + 1] = color.g;
      raw[px + 2] = color.b;
    }
  }
  const idat = pngChunk("IDAT", deflateSync(raw));
  const iend = pngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const WAV_SAMPLE_RATE = 44100;
const WAV_TONE_HZ = 440;
const WAV_AMPLITUDE = 3000;

export function makeToneWav(durationMs: number): Buffer {
  const numSamples = Math.round((durationMs / 1000) * WAV_SAMPLE_RATE);
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(WAV_SAMPLE_RATE, 24);
  header.writeUInt32LE(WAV_SAMPLE_RATE * bytesPerSample, 28);
  header.writeUInt16LE(bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataSize, 40);

  const data = Buffer.alloc(dataSize);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(
      WAV_AMPLITUDE * Math.sin((2 * Math.PI * WAV_TONE_HZ * i) / WAV_SAMPLE_RATE),
    );
    data.writeInt16LE(sample, i * bytesPerSample);
  }

  return Buffer.concat([header, data]);
}

#!/usr/bin/env node
// One-off generator for the task-002 sample fixtures (be/src/render/fixtures/sample-*.png/.wav).
// Written in pure Node (zlib for PNG, hand-rolled WAV header) so it needs no external tool
// (ffmpeg is not available in every dev environment) and every fixture's duration is EXACT,
// not rounded by an encoder — that precision is what the render integration test's ffprobe
// comparison relies on. Re-run with `node generate-fixtures.mjs` only if the sample set changes.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL(".", import.meta.url));

const SCENES = [
  { filename: "sample-1", durationMs: 2000, color: [220, 60, 60] },
  { filename: "sample-2", durationMs: 3000, color: [60, 160, 90] },
  { filename: "sample-3", durationMs: 2500, color: [60, 100, 220] },
];

const WIDTH = 1920;
const HEIGHT = 1080;
const SAMPLE_RATE = 44100;

function crc32(buf) {
  let c;
  const table = (crc32.table ??= (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makeSolidColorPng(width, height, [r, g, b]) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = pngChunk("IHDR", ihdrData);

  const rowBytes = width * 3;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }
  const idat = pngChunk("IDAT", deflateSync(raw));
  const iend = pngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeSilentWav(durationMs, sampleRate) {
  const numSamples = Math.round((durationMs / 1000) * sampleRate);
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * bytesPerSample, 28); // byte rate
  header.writeUInt16LE(bytesPerSample, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataSize, 40);

  // A quiet 440Hz tone (not pure silence) so the audio track is verifiably non-empty.
  const data = Buffer.alloc(dataSize);
  const amplitude = 3000;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(amplitude * Math.sin((2 * Math.PI * 440 * i) / sampleRate));
    data.writeInt16LE(sample, i * bytesPerSample);
  }

  return Buffer.concat([header, data]);
}

for (const scene of SCENES) {
  writeFileSync(`${DIR}${scene.filename}.png`, makeSolidColorPng(WIDTH, HEIGHT, scene.color));
  writeFileSync(`${DIR}${scene.filename}.wav`, makeSilentWav(scene.durationMs, SAMPLE_RATE));
  console.log(
    `generated ${scene.filename}.png + ${scene.filename}.wav (${String(scene.durationMs)}ms)`,
  );
}

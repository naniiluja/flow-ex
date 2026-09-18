import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";

const execFileAsync = promisify(execFile);

/** whisper.cpp requires a 16kHz mono WAV (video.md's Captions section); Vbee's own output is
 * 44.1kHz mono MP3 (vbee-tts.md's verified sample), so this always runs before `transcribe()`.
 * Uses the same npm-packaged ffmpeg binary as `render-video.test.ts`'s pixel sampling
 * (tech-stack.md's rationale for choosing the npm installer over a system Homebrew install). */
export async function convertToWav16kMono(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync(ffmpegPath, ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", outputPath]);
}

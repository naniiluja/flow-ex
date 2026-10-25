// Renders every scene of vietsu.html to <outDir>/scene-NN.mp4 (one headless-Chrome worker per scene, N at a time).
//   node viet-su/render-clips.mjs <outDir> [--jobs=4] [--fps=24] [--only=08,09]   (skips clips that already exist)
// Needs ffmpeg on PATH (the shim dir from the session) and the VS_TIMES table from build-times.mjs.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), outDir = resolve(args.find(a => !a.startsWith('--')) ?? 'out/clips');
const opt = (k, d) => (args.find(a => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const jobs = +opt('jobs', 4), fps = opt('fps', 24), only = opt('only', '').split(',').filter(Boolean);
const times = new Function(`${readFileSync(resolve(root, 'src/scenes/vs_times.js'), 'utf8')}; return VS_TIMES;`)();
mkdirSync(outDir, { recursive: true });

const todo = times.filter(s => (!only.length || only.includes(s.id)) && !existsSync(resolve(outDir, `scene-${s.id}.mp4`)));
let running = 0, next = 0, failed = [];
const run = (s) => new Promise((done) => {
  const t0 = Date.now(), out = resolve(outDir, `scene-${s.id}.mp4`);
  const p = spawn('node', ['render.mjs', '--page=vietsu.html', '--clip', `--range=${s.start}:${s.end}`, `--fps=${fps}`, `--out=${out}.part.mp4`], { cwd: root, stdio: 'ignore' });
  p.on('exit', async (code) => {
    if (code === 0) { const { renameSync } = await import('node:fs'); renameSync(`${out}.part.mp4`, out); } else failed.push(s.id);
    console.log(`scene ${s.id} ${code === 0 ? 'ok' : 'FAILED'} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    done();
  });
});
await new Promise((resolveAll) => {
  const pump = () => {
    while (running < jobs && next < todo.length) { running++; run(todo[next++]).then(() => { running--; pump(); }); }
    if (running === 0 && next >= todo.length) resolveAll();
  };
  pump();
});
console.log(failed.length ? `failed: ${failed.join(',')}` : `done: ${todo.length} clips in ${outDir}`);
process.exit(failed.length ? 1 : 0);

---
name: claude-animation-base
description: Animate hand-painted 2D cartoon videos of the Clawd character (31 acted emotions) with p5.js + p5.brush, rendered to MP4 through headless Chrome and ffmpeg. Use when the user asks for a hand-painted / brush-stroke cartoon animation, a Clawd video, or a short character-animation clip built in code. Not for stock footage, screen recordings, or HTML/Remotion motion graphics.
---

# Claude Animation Base

Starter kit from github.com/JohnHeibel/ClaudeAnimationBase (MIT). Upstream ships no SKILL.md; this file only routes to its own guide.

## Workflow

1. Read `ANIMATION_GUIDE.md` in this folder in full before writing any scene. It holds the rules (handmade, alive, one piece, no text, transitions always, something happens in every scene) and the character-animation principles.
2. Look at `docs/emotions.jpg` (all 31 emotions) and `docs/views.jpg` (five key views, motion helpers, hats) to pick poses.
3. Storyboard first, then build shot by shot under `src/scenes/`, using `src/clawd.js`, `src/timeline.js`, `src/config.js`.
4. Check your own work with contact sheets before the full render.

## Run

Needs Node.js, Google Chrome and ffmpeg. Run from this folder:

```bash
npm install                                          # first time only (p5, p5.brush, puppeteer-core)
npm run sheet                                        # contact sheet -> out/sheet.jpg
npm run video                                        # full render  -> out/video.mp4
node gpu_probe.mjs                                   # check whether a GPU is available
```

Without a dedicated GPU, p5.brush watercolour fills render in seconds per frame: avoid them and use another fill instead.

Deliver `out/video.mp4` and tell the user its path. `node_modules/` and `out/` are git-ignored.

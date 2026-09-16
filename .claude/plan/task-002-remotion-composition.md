# Task 002 — Composition Remotion + Player, render MP4 mẫu

- **Lát cắt dọc:** video + fe + be
- **Phụ thuộc:** 001
- **Spec refs:** `../rules/video.md`, `../rules/tech-stack.md`
- **MCP cần dùng:** none
- **Gate (phải GREEN trước khi sang lát cắt kế):** unit (bảng thời lượng cảnh, tổng thời lượng `TransitionSeries`, safe viewport EP/BVA) + render 3 cảnh mẫu, `ffprobe` xác nhận thời lượng khớp tính toán

## Mục tiêu (một câu)

Với 3 cảnh mẫu (ảnh tĩnh + audio giả cố định thời lượng), composition Remotion render ra MP4 có Ken Burns trong vùng an toàn, chuyển cảnh spring/cross-zoom mượt, và Player preview đúng như bản render.

## Acceptance criteria (kiểm chứng được)

- [ ] `sceneDurationInFrames(audioSec, fps, transitionFrames)` = `Math.ceil(audioSec*fps) + transitionFrames`, có test biên (audioSec = 0.001, số lẻ, số chẵn).
- [ ] `safe-viewport.ts`: cho ảnh + khung + ô logo giả định (`TODO(measure)`), `minScale` và vùng pan không bao giờ để khung nhìn giao ô logo, kiểm ở frame đầu/giữa/cuối/sát biên.
- [ ] `calculateMetadata` tính đúng `durationInFrames`/`width`/`height` từ `project.json` (không tự đo audio).
- [ ] Render 3 cảnh mẫu ra `output.mp4` bằng `bundle()` một lần + `renderMedia`; `ffprobe -show_format` khớp tổng thời lượng tính toán (sai số ≤ 1 frame).
- [ ] Player mount composition gốc (không bọc `<Composition>`), preview khớp file render (cùng danh sách asset, cùng props).
- [ ] Ken Burns không rung sub-pixel (kiểm bằng mắt qua 1 lần render thật, ghi chú trong PR, không cần test tự động cho mục này).

## Test trước (viết trước khi cài đặt)

- Unit: `video/src/timing/scene-duration.test.ts`, `video/src/timing/safe-viewport.test.ts` (bảng EP/BVA).
- Integration: script render CLI 3 cảnh mẫu → assert file tồn tại + `ffprobe` thời lượng.

## Files to touch

- `video/src/timing/scene-duration.ts`, `video/src/timing/safe-viewport.ts` (+ `.test.ts` mỗi file).
- `video/src/compositions/main-composition.tsx` (`TransitionSeries`, Ken Burns, cross-zoom presentation tự viết).
- `be/src/render/render-video.ts` (`bundle()` + `selectComposition` + `renderMedia`).
- `fe/src/pages/project-preview.tsx` (Remotion Player).
- `be/src/routes/assets.ts` (serve ảnh/audio mẫu qua HTTP cho cả Player và renderer).

## Bước thực hiện (lát cắt mỏng xuyên suốt)

1. Viết test thất bại cho timing + safe-viewport trước.
2. Cài đặt composition + render script + Player, xuyên suốt video → be → fe.
3. Chạy test + render thật, so khớp `ffprobe` — gate GREEN, đánh `in-review`.
4. `/ccf:check` → `/ccf:updatespec` — `done` chỉ ở đây.

## Ghi chú / nguồn best-practice

Remotion 4.0.525 (`transitions/transitionseries.mdx`, `troubleshooting/subpixel-rendering.mdx`, `media/audio.mdx`, `ssr-node.mdx`). Ô logo watermark dùng giá trị giả định, đo thật ở task 005.

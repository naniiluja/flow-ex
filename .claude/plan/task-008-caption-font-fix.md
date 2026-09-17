# Task 008 — Sửa phụ đề: font tiếng Việt không còn bể

**Trạng thái:** todo
**Predecessor:** không (chạy song song với 009-014, worktree riêng)
**Chi tiết đầy đủ:** xem "Task 008" trong `/Users/naniiluja/.claude/plans/t-i-mu-n-s-a-l-i-moonlit-giraffe.md`

## Tóm tắt
`video/src/captions/tiktok-captions.tsx:10` gọi `loadFont()` nhưng bỏ `waitUntilDone`, nên SSR render trước khi font tải xong → chữ vẽ sai dấu. Kèm `lineHeight` mặc định cắt dấu tầng đôi và `WebkitTextStroke: 3px` làm dấu bết.

## Files
- `video/src/captions/tiktok-captions.tsx` — await font qua `delayRender`/`continueRender`, `lineHeight: 1.35`, stroke `2px` + `textShadow`, `fontWeight: 800`.
- `video/src/captions/font.ts` (mới)
- `video/src/captions/tiktok-captions.test.tsx` (mới)
- `be/src/render/render-video.test.ts` — thêm assertion pixel

## Test trước (đỏ)
- Mock `delayRender`/`continueRender`, assert gọi đúng cặp.
- Matrix EP/BVA cho `font.ts`.
- Integration: render scene có dấu tầng đôi, sample pixel vùng phụ đề, assert có `#39e75f` và trắng.

## Gate
Unit (`video`) + integration (`be` render) xanh.

# Task 009 — Preset TikTok / YouTube xuyên suốt

**Trạng thái:** todo
**Predecessor:** không (chạy song song, worktree riêng)
**Chi tiết đầy đủ:** xem "Task 009" trong `/Users/naniiluja/.claude/plans/t-i-mu-n-s-a-l-i-moonlit-giraffe.md`

## Tóm tắt
Thêm `preset: "tiktok" | "youtube"` vào `scriptInputSchema`; một bảng preset duy nhất quyết định khung hình, style phụ đề, tốc độ đọc Vbee, gợi ý độ dài. `aspectRatio` tường minh vẫn thắng nếu người dùng ghi rõ.

## Files
- `packages/shared-schemas/src/index.ts`, `packages/shared-schemas/src/presets.ts` (mới)
- `video/src/captions/tiktok-captions.tsx`, `video/src/compositions/main-composition.tsx`
- `be/src/routes/render.ts`, `be/src/providers/select-providers.ts`
- `fe/src/pages/new-project-page.tsx` — preset picker
- `.claude/rules/video.md`, `be/.claude/rules/vbee-tts.md`

## Test trước (đỏ)
- Matrix EP/BVA cho `presets.ts` (mỗi preset, preset lạ, xung đột `aspectRatio`).
- Migration: `schemaVersion` cũ không có `preset` vẫn load được.
- `main-composition.test.ts` preset → dimensions đúng.
- `new-project-page.test.tsx` chọn YouTube → payload có `preset: "youtube"`.

## Gate
Unit (shared-schemas, video, fe) + integration BE (`POST /api/projects` với preset) xanh.

## Ghi chú merge
Sẽ đụng `shared-schemas/index.ts` và `new-project-page.tsx` cùng task 013 — xử lý ở bước Merge cuối cùng của Rem.

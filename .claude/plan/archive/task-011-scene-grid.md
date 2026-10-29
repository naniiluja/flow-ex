# Task 011 — Lưới ảnh: scene hiển thị dạng ô

**Trạng thái:** dropped
**Predecessor:** không (chạy song song, worktree riêng — sẽ đụng `app.tsx`/`AppShell` của task 010 lúc merge, đã được ngài chấp nhận)
**Chi tiết đầy đủ:** xem "Task 011" trong `/Users/naniiluja/.claude/plans/t-i-mu-n-s-a-l-i-moonlit-giraffe.md`

## Tóm tắt
`project-scenes-page.tsx`/`project-review-page.tsx` hiện là `flex flex-col` chạy dọc. Đổi thành lưới responsive, mỗi scene một card gọn, click mở `Dialog` xem to + duyệt/sinh lại (pattern Google Photos/Midjourney).

## Component cần `add`
`aspect-ratio`, `dialog`, `scroll-area`, `toggle-group`.

## Files
- `fe/src/components/scene-grid.tsx`, `scene-card.tsx`, `scene-detail-dialog.tsx` (mới, tái dùng `SceneVariantPicker`/`SceneAudioPreview`).
- `fe/src/pages/project-scenes-page.tsx`, `project-review-page.tsx` — thay danh sách dọc bằng `SceneGrid`, banner lỗi → `Alert`.
- `fe/src/components/project-log-tab.tsx` — bọc `ScrollArea`.
- `fe/.claude/rules/frontend-conventions.md` — rule "mọi primitive từ shadcn".

## Test trước (đỏ)
- `scene-grid.test.tsx`, `scene-card.test.tsx` (matrix theo `SceneStatus`), `scene-detail-dialog.test.tsx`.
- Test cũ hai page phải vẫn xanh sau khi cập nhật selector.

## Gate
Unit FE xanh + chụp ảnh lưới ở 1440px và 390px.

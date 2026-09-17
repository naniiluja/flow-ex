# Task 006 — Bước duyệt: dừng để duyệt, chọn biến thể, sinh lại, tải 2K

- **Lát cắt dọc:** fe + be
- **Phụ thuộc:** 005
- **Spec refs:** `../../be/.claude/rules/flow-automation.md`, `../../fe/.claude/rules/component-design.md`
- **MCP cần dùng:** shadcn (thêm component lưới chọn ảnh / dialog xác nhận qua MCP trước khi tự viết)
- **Gate (phải GREEN trước khi sang lát cắt kế):** unit (chọn biến thể/sinh lại) + test component + e2e giả dừng ở bước duyệt rồi render

## Mục tiêu (một câu)

Sau khi Flow sinh ảnh, dự án dừng lại nếu công tắc "Dừng để duyệt" đang mở, cho cậu chủ chọn 1 trong các biến thể hoặc sinh lại một cảnh, rồi mới tải bản 2K và cho render.

## Acceptance criteria (kiểm chứng được)

- [x] Trước khi tự viết, kiểm tra shadcn MCP có component lưới ảnh chọn được (radio-group / card) và dùng lại thay vì viết từ đầu. (dùng shadcn's `radio-group`, `pnpm dlx shadcn@latest add radio-group`.)
- [x] Công tắc "Dừng để duyệt" là tuỳ chọn mỗi lần chạy (đã chốt ở phần khảo sát), lưu trong `project.json`, đọc lại đúng khi resume. (`reviewEnabled` trong `scriptInputSchema`, mặc định `false`.)
- [x] Khi công tắc mở, pipeline dừng ở trạng thái `awaiting_review` sau khi ảnh (các biến thể) sinh xong, không tự tiến sang bước tải 2K/audio. (`be/src/pipeline/pipeline-engine.ts`'s `run()`: mỗi cảnh dừng audio lại nếu vừa vào `awaiting_review`, rồi toàn run pause ở `runStatus: "awaiting_review"` sau vòng lặp.)
- [x] FE hiện lưới biến thể; chọn 1 → `POST /api/projects/:id/scenes/:index/approve` chuyển trạng thái tiếp; "Sinh lại" → `POST .../regenerate` gọi lại `FlowImageProvider` cho đúng cảnh đó. (`fe/src/pages/project-review-page.tsx` + `fe/src/components/scene-variant-picker.tsx` + `be/src/routes/scenes.ts`.)
- [ ] Chỉ tải bản 2K sau khi đã xác minh không vượt hạn mức credit (kiểm tra thủ công 1 lần ở task 005, ghi lại quy tắc ở đây). **CHƯA làm** (2026-09-17): task 005 đã chạy smoke test thật THÀNH CÔNG (sinh 1 ảnh 1K thật), nhưng chưa thử tải bản 2K — việc đó cần MỘT lượt tốn credit riêng, ngoài phạm vi smoke test 1 ảnh 1K vừa xin phép. Approve/regenerate hiện dùng luôn ảnh 1K provider trả về; tải 2K để lại cho một lượt sau, khi có xác nhận rõ chi phí credit.
- [ ] Preview qua Player (từ task 002) trước khi bấm "Render" cuối. **CHƯA làm**: `fe/src/pages/project-preview-page.tsx` (task 002) vẫn chỉ phát sample cố định, chưa có route Player nhận project thật (`video.md`'s asset-URL wiring cho từng project chưa tới lượt). `ProjectReviewPage` hiện cho Render thẳng sau khi duyệt hết, không chặn qua Player.
- [x] e2e: chạy pipeline giả, dừng ở `awaiting_review`, duyệt 1 cảnh, render ra `output.mp4`. (`be/src/routes/render.test.ts`'s "pauses at awaiting_review, then completes after approving every scene and re-posting /render".)

## Test trước (viết trước khi cài đặt)

- Unit: `approve-scene.test.ts`, `regenerate-scene.test.ts` (chọn biến thể hợp lệ/không hợp lệ, sinh lại khi đang ở trạng thái khác `awaiting_review`).
- Component: lưới biến thể render đúng, nút "Sinh lại" gọi đúng API.
- e2e: pipeline giả dừng → duyệt → render.

## Files to touch

- `be/src/pipeline/state-machine.ts` — thêm trạng thái `awaiting_review`.
- `be/src/routes/scenes.ts` — `approve`/`regenerate`.
- `fe/src/components/scene-variant-picker.tsx` (từ shadcn MCP), `fe/src/pages/project-review.tsx`.

## Bước thực hiện (lát cắt mỏng xuyên suốt)

1. Tra shadcn MCP tìm component phù hợp trước khi viết test.
2. Viết test thất bại (unit + component + e2e) trước.
3. Cài đặt xuyên suốt be → fe.
4. Chạy test — gate GREEN, đánh `in-review`.
5. `/ccf:check` → `/ccf:updatespec` — `done` chỉ ở đây.

## Vòng review độc lập (`ccf-spec-checker`, 2026-09-17)

Phát hiện và đã sửa ngay trong session:
- Bug thật: cả `FakeImageProvider` và `FlowImageProvider` đặt tên file ảnh chỉ theo `sceneIndex`, nên "Sinh lại" ghi đè file cũ, mọi biến thể trỏ vào đúng 1 file. Sửa bằng cách nhúng UUID của Flow (thật) hoặc số lần gọi (giả) vào tên file.
- Kiến trúc: route `regenerate` từng tự dựng provider, tự gọi `generateImage`, tự log/ghi store, và còn import chéo từ `render.ts` sang `scenes.ts`. Tách logic sang `be/src/pipeline/scene-review.ts`, còn việc chọn/dựng provider sang `be/src/providers/select-providers.ts` (dùng chung, cache theo `projectId` để không rò kết nối CDP mỗi lần "Sinh lại").
- FE: `SceneVariantPicker` không đồng bộ lại lựa chọn sau khi "Sinh lại" xong; `ProjectReviewPage` không hiện lỗi mutation. Cả hai đã sửa + có test hồi quy.
- Đổi tên mã lỗi `SCENE_VARIANT_NOT_FOUND` → `SCENE_VARIANT_INVALID` (đúng ngữ nghĩa 400, không phải 404).
- `approve` giờ phát `event: scene` qua SSE (đúng `api-design.md`); `api-design.md` đã cập nhật ghi rõ 2 route mới.

Chưa làm (không phải bug, để lại có chủ đích): dọn file biến thể không được chọn trên đĩa (danh sách `imageVariants` tăng không giới hạn qua nhiều lần "Sinh lại"). Cân nhắc lại khi tải 2K được thêm vào, vì lúc đó cách đặt tên file cần thiết kế lại một lần cho cả hai nhu cầu.

## Ghi chú / nguồn best-practice

Xem quyết định "Duyệt ảnh bằng công tắc" trong lịch sử phỏng vấn `/ccf:init`.

# Task 006 — Bước duyệt: dừng để duyệt, chọn biến thể, sinh lại, tải 2K

- **Lát cắt dọc:** fe + be
- **Phụ thuộc:** 005
- **Spec refs:** `../../be/.claude/rules/flow-automation.md`, `../../fe/.claude/rules/component-design.md`
- **MCP cần dùng:** shadcn (thêm component lưới chọn ảnh / dialog xác nhận qua MCP trước khi tự viết)
- **Gate (phải GREEN trước khi sang lát cắt kế):** unit (chọn biến thể/sinh lại) + test component + e2e giả dừng ở bước duyệt rồi render

## Mục tiêu (một câu)

Sau khi Flow sinh ảnh, dự án dừng lại nếu công tắc "Dừng để duyệt" đang mở, cho cậu chủ chọn 1 trong các biến thể hoặc sinh lại một cảnh, rồi mới tải bản 2K và cho render.

## Acceptance criteria (kiểm chứng được)

- [ ] Trước khi tự viết, kiểm tra shadcn MCP có component lưới ảnh chọn được (radio-group / card) và dùng lại thay vì viết từ đầu.
- [ ] Công tắc "Dừng để duyệt" là tuỳ chọn mỗi lần chạy (đã chốt ở phần khảo sát), lưu trong `project.json`, đọc lại đúng khi resume.
- [ ] Khi công tắc mở, pipeline dừng ở trạng thái `awaiting_review` sau khi ảnh (các biến thể) sinh xong, không tự tiến sang bước tải 2K/audio.
- [ ] FE hiện lưới biến thể; chọn 1 → `POST /api/projects/:id/scenes/:index/approve` chuyển trạng thái tiếp; "Sinh lại" → `POST .../regenerate` gọi lại `FlowImageProvider` cho đúng cảnh đó.
- [ ] Chỉ tải bản 2K sau khi đã xác minh không vượt hạn mức credit (kiểm tra thủ công 1 lần ở task 005, ghi lại quy tắc ở đây).
- [ ] Preview qua Player (từ task 002) trước khi bấm "Render" cuối.
- [ ] e2e: chạy pipeline giả, dừng ở `awaiting_review`, duyệt 1 cảnh, render ra `output.mp4`.

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

## Ghi chú / nguồn best-practice

Xem quyết định "Duyệt ảnh bằng công tắc" trong lịch sử phỏng vấn `/ccf:init`.

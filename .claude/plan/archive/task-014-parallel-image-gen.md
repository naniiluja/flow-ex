# Task 014 — Gen ảnh song song trên một tab Flow

**Trạng thái:** done
**Predecessor:** không (chạy song song, worktree riêng, viết trên giả định `flow-automation.ts` CHƯA có thay đổi của task 013)
**Chi tiết đầy đủ:** xem "Task 014" trong `/Users/naniiluja/.claude/plans/t-i-mu-n-s-a-l-i-moonlit-giraffe.md`

## Vấn đề chặn (logic, không phải Chrome)
`submitAndWaitForImage` (`flow-automation.ts:148-202`) chụp tập UUID trước submit rồi chờ "UUID nào mới" — 2 job song song sẽ giật ảnh của nhau.

## Thiết kế
- Mutex CHỈ quanh phần submit: đính reference (nếu có) → gõ prompt → bấm generate → chờ tile pending MỚI xuất hiện → ghi nhận danh tính tile → nhả mutex. Phần chờ ~28s còn lại chạy ngoài mutex, bám tile riêng.
- Cần verify live cách nhận diện bền một tile trước khi code (dùng bước "Chrome tự mở" trong bản kế hoạch).
- Pipeline: pha ảnh qua `p-queue`, `FLOW_IMAGE_CONCURRENCY` (mặc định 3, tự hạ về 1 khi lỗi liên tiếp).
- Mọi step song song chỉ đọc state BÊN TRONG callback `store.update`, không đọc biến `project` cũ ngoài callback (race hiện có nếu chạy song song).

## Files
`be/src/providers/flow/flow-automation.ts`, `be/src/pipeline/pipeline-engine.ts`, `be/.claude/rules/backend-conventions.md`, `flow-automation.md`.

## Test trước (đỏ)
`flow-automation.test.ts` với 3 job hoàn thành theo thứ tự ĐẢO trên cùng 1 page (phải ĐỎ trên code hiện tại); matrix concurrency; race persist 3 scene đồng thời; resume; smoke Flow thật đo thời gian.

## Gate
Unit + integration fixture (test đảo thứ tự) + resume + 1 smoke Flow thật xanh.

## Ghi chú merge
Xem ghi chú merge của task 013 — cùng file, cùng hàm.

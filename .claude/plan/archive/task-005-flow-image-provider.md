# Task 005 — `FlowImageProvider` thật (đường mỏng)

- **Lát cắt dọc:** be
- **Phụ thuộc:** 004
- **Spec refs:** `../../be/.claude/rules/flow-automation.md`, `../rules/video.md` (đo ô watermark)
- **MCP cần dùng:** shadcn (không dùng ở task này, chỉ nhắc là đã sẵn); dùng `claude-in-chrome` để xác minh lại selector Flow còn đúng trước khi code
- **Gate (phải GREEN trước khi sang lát cắt kế):** integration trên HTML fixture lưu từ Flow thật + smoke 1 cảnh thật (xin phép trước, vì tốn thời gian/khả năng tốn credit)

## Mục tiêu (một câu)

Thay `FakeImageProvider` bằng `FlowImageProvider` thật: mở Chrome profile riêng qua CDP, gõ prompt an toàn (assert focus), sinh ảnh, tải 1K, đo ô watermark thật để khoá hằng số cho `safe-viewport`.

## Acceptance criteria (kiểm chứng được)

- [x] Trước khi code, xác minh lại các selector trong `flow-automation.md` còn đúng trên Flow thật; ghi chú nếu có thay đổi. **Xác minh thật 2026-09-17** trên `https://flow.google.com/project/<uuid>` (sau khi cậu chủ đăng nhập). Phát hiện DUY NHẤT 1 drift có thật: `.ProseMirror` không còn nằm trong 1 tag bọc cố định — Flow đổi CẢ tag bọc theo trạng thái agent-mode (`flow-creative-agent-prompt-box` khi BẬT, `flow-prompt-box` khi TẮT), nên `PROMPT_EDITOR_SELECTOR` giờ bỏ hẳn tag bọc, chỉ còn `.ProseMirror` (đã xác nhận luôn duy nhất trên trang ở cả 2 trạng thái). `agent-mode-chip`/`settings-trigger-button` KHÔNG đổi — Rem có lúc tưởng nhầm là đổi (do kiểm tra lúc agent-mode đang BẬT, làm `settings-trigger-button` bị `hidden` đúng như thiết kế), đã tự phát hiện và sửa lại đúng.
- [x] Preflight command định vị đủ mọi selector (prompt box, agent-mode chip, generate button, settings) không cần submit; log rõ selector nào thiếu. **Chạy thật, PASS** trên Chrome CDP thật.
- [x] Không đăng nhập → `AppError.errorKind = 'needs_user'`, không crash tiến trình.
- [x] Tắt agent-mode chip trước khi gõ; gõ theo trình tự `click()` → assert focus → `pressSequentially()`. **Xác nhận qua smoke test thật**: agent-mode chip mặc định BẬT trên project có sẵn, `ensureAgentModeOff` tắt đúng, mở khoá `settings-trigger-button`.
- [x] Chọn đúng tỉ lệ 16:9/9:16 và model theo `project.json`; gửi; nhận UUID ảnh mới từ `<img src>`. **Xác nhận qua smoke test thật**, ảnh 1376x768 sinh thành công.
- [x] Tải ảnh bằng `context.request.get(src)`, lưu vào `projects/<id>/assets/images/<sceneIndex>-<uuid>.<ext>`. **Xác nhận qua smoke test thật**: file `.jpg` thật (không phải `.png` như giả định trước đó), 77KB, đúng ánh sáng/nội dung theo prompt.
- [x] Đo ô watermark thật (ở 1K) từ ảnh vừa tải, cập nhật hằng số trong `video.md` (bỏ `TODO(measure)`). **Đo xong cho 16:9** (`ASSUMED_LOGO_BOX = {x:0.66, y:0.74, width:0.34, height:0.26}`, xem `video.md`). **9:16 CHƯA đo** — cần sinh thêm 1 ảnh 9:16 thật (tốn thêm credit Flow), nằm ngoài phạm vi lần chạy này; 16:9 box đang dùng làm mặc định tạm cho cả 9:16.
- [x] Lỗi Playwright bất kỳ → lưu `page.screenshot()` + `page.content()` làm artifact trước khi rethrow.
- [x] Smoke 1 cảnh thật: đã xin phép cậu chủ, đã chạy — **THÀNH CÔNG**. Ảnh thật sinh ra, đo watermark thật từ đó (mục trên).

**Ghi chú quan trọng:** tab Flow trong Chrome profile riêng phải đang MỞ SẴN một project thật (`/project/<uuid>`), không chỉ ở trang chủ/danh sách project (`flow.google.com/`) — trang chủ không có prompt box nên mọi selector sẽ "MISS". `flow-image-provider.ts`/`preflight.ts` không tự tạo/mở project (quyết định phạm vi có chủ đích, tránh tạo project rác mỗi lần chạy); cậu chủ cần tự mở 1 project trong Chrome đó trước khi chạy pipeline thật.

**Nợ kỹ thuật để lại có chủ đích (phát hiện qua `/ccf:check`, 2026-09-17):** task này tạo ra nhà sản xuất lỗi `needs_user` THẬT đầu tiên cho ảnh (`FLOW_NOT_LOGGED_IN`). Nhưng `sceneErrorSchema` chưa có `errorKind`, và pipeline chưa có đường "chạy lại" một cảnh `failed` do `needs_user` (khác với hết lịch retry) — hiện tại một khi Flow hết đăng nhập giữa lúc chạy, cảnh đó kẹt ở `failed` vĩnh viễn, không route nào gỡ được. Xem `.claude/rules/error-handling.md`'s "Known gap". Không sửa trong lát cắt này (không thuộc AC của 005/006/007); cần một task riêng.

**Gate GREEN** (integration fixture + smoke thật) — mọi AC đã kiểm chứng được đều đạt, chỉ còn khoảng đo 9:16 để lại có chủ đích cho một lượt real-credit riêng sau này.

## Test trước (viết trước khi cài đặt)

- Integration: lưu HTML fixture 1 lần từ Flow thật (qua `claude-in-chrome`, đọc-only), viết test Playwright chạy trên fixture đó để xác nhận selector.
- Smoke: 1 lần chạy thật, xin phép trước khi thực thi.

## Files to touch

- `be/src/providers/flow/flow-image-provider.ts`, `be/src/providers/flow/preflight.ts`.
- `be/src/providers/flow/flow-image-provider.test.ts` (fixture-based).
- `video/src/timing/safe-viewport.ts` — cập nhật hằng số ô logo đo được.
- `chrome-profile/` — thêm vào `.gitignore` (đã có ở task 001, xác nhận lại).

## Bước thực hiện (lát cắt mỏng xuyên suốt)

1. Xác minh lại selector qua `claude-in-chrome` (đọc-only), viết test fixture thất bại trước.
2. Cài đặt provider thật, chạy preflight, xuyên suốt be.
3. Chạy test fixture + 1 smoke thật (xin phép) — gate GREEN, đánh `in-review`.
4. `/ccf:check` → `/ccf:updatespec` — `done` chỉ ở đây, kèm cập nhật `flow-automation.md` nếu Flow đổi UI.

## Ghi chú / nguồn best-practice

Toàn bộ sự thật khảo sát Flow nằm ở `../../be/.claude/rules/flow-automation.md`. Playwright 1.63 `connectOverCDP`, `context.request` cho tải file.

# Task 005 — `FlowImageProvider` thật (đường mỏng)

- **Lát cắt dọc:** be
- **Phụ thuộc:** 004
- **Spec refs:** `../../be/.claude/rules/flow-automation.md`, `../rules/video.md` (đo ô watermark)
- **MCP cần dùng:** shadcn (không dùng ở task này, chỉ nhắc là đã sẵn); dùng `claude-in-chrome` để xác minh lại selector Flow còn đúng trước khi code
- **Gate (phải GREEN trước khi sang lát cắt kế):** integration trên HTML fixture lưu từ Flow thật + smoke 1 cảnh thật (xin phép trước, vì tốn thời gian/khả năng tốn credit)

## Mục tiêu (một câu)

Thay `FakeImageProvider` bằng `FlowImageProvider` thật: mở Chrome profile riêng qua CDP, gõ prompt an toàn (assert focus), sinh ảnh, tải 1K, đo ô watermark thật để khoá hằng số cho `safe-viewport`.

## Acceptance criteria (kiểm chứng được)

- [ ] Trước khi code, dùng `claude-in-chrome` xác minh lại các selector trong `flow-automation.md` còn đúng trên Flow thật; ghi chú nếu có thay đổi.
- [ ] Preflight command định vị đủ mọi selector (prompt box, agent-mode chip, generate button, settings, tile ảnh) không cần submit; log rõ selector nào thiếu.
- [ ] Không đăng nhập → `AppError.errorKind = 'needs_user'`, không crash tiến trình.
- [ ] Tắt agent-mode chip trước khi gõ; gõ theo trình tự `click()` → assert focus → `pressSequentially()`.
- [ ] Chọn đúng tỉ lệ 16:9/9:16 và model theo `project.json`; gửi; nhận UUID ảnh mới từ `<img src>`.
- [ ] Tải ảnh 1K bằng `context.request.get(src)`, lưu vào `projects/<id>/images/<sceneIndex>.png`.
- [ ] Đo ô watermark thật (16:9 và 9:16, ở 1K) từ ảnh vừa tải, cập nhật hằng số trong `video.md` (bỏ `TODO(measure)`).
- [ ] Lỗi Playwright bất kỳ → lưu `page.screenshot()` + `page.content()` làm artifact trước khi rethrow.
- [ ] Smoke 1 cảnh thật: xin phép cậu chủ trước khi chạy (có thể tốn credit Flow).

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

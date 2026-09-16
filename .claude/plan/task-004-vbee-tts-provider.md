# Task 004 — `VbeeTtsProvider` thật

- **Lát cắt dọc:** be + fe
- **Phụ thuộc:** 003
- **Spec refs:** `../../be/.claude/rules/vbee-tts.md`
- **MCP cần dùng:** none
- **Gate (phải GREEN trước khi sang lát cắt kế):** unit (bảng zod khối `tts` + phân loại lỗi) + integration msw (đủ ma trận dưới) + smoke 1 câu thật

## Mục tiêu (một câu)

Thay `FakeTtsProvider` bằng `VbeeTtsProvider` thật theo hợp đồng đã kiểm chứng ở `vbee-tts.md`, đo `durationMs`, và cho nghe thử audio từng cảnh trên UI.

## Acceptance criteria (kiểm chứng được)

- [ ] `POST` async ghi `requestId` atomic ngay khi nhận HTTP 201, trước khi bắt đầu polling.
- [ ] Polling 2s → giãn 5s → timeout 5 phút, coi là `transient` khi hết giờ.
- [ ] `COMPLETED` → theo redirect `audioLink` (302 → S3), kiểm magic bytes MP3, rename vào `projects/<id>/audio/<sceneIndex>.mp3`, đo `durationMs`.
- [ ] Link hết hạn (403/404) → `GET` lấy link mới, tối đa 2 lần.
- [ ] Resume: file đã có → bỏ qua; `requestId` < 3 ngày → chỉ `GET`; `"Request is not found"` hoặc > 3 ngày → `POST` mới (log `vbee.request.resubmit`).
- [ ] Phân loại lỗi đúng bảng: 401 (HTML) → `needs_user`; 400 tín dụng → `needs_user`; 400 khác → `fatal`; 429/5xx/timeout/mạng → `transient`.
- [ ] zod validate khối `tts` đúng mọi miền giá trị (bảng EP/BVA ở `vbee-tts.md`).
- [ ] FE: mỗi cảnh có nút nghe thử audio (`<audio>` trỏ tới file đã tải).
- [ ] Redact `authorization`, `app-id`, `VBEE_TOKEN`, `audioLink`, `X-Amz-*` trong mọi log.

## Test trước (viết trước khi cài đặt)

- Unit: `vbee-schema.test.ts`, `vbee-error-classification.test.ts`.
- Integration (msw 2, `setupServer`): 201 PROCESSING→COMPLETED, 302→S3, link hết hạn→GET lại, 401 HTML, 400 credit, 400 voiceCode, 429, 500, timeout polling, resume dùng lại `requestId`, `"Request is not found"`→POST mới.
- Smoke: 1 request thật ≤1 câu ngắn (xin phép trước khi chạy, tốn credit thật).

## Files to touch

- `be/src/providers/vbee/vbee-tts-provider.ts`, `be/src/providers/vbee/vbee-schema.ts`.
- `be/src/providers/vbee/vbee-tts-provider.test.ts` (msw).
- `fe/src/components/scene-audio-preview.tsx`.
- `.env.example` — thêm `VBEE_APP_ID`, `VBEE_TOKEN`, `VBEE_WEBHOOK_URL` (rỗng, cậu chủ tự điền).

## Bước thực hiện (lát cắt mỏng xuyên suốt)

1. Viết test thất bại (msw + zod) trước.
2. Cài đặt provider thật, xuyên suốt be → fe.
3. Chạy toàn bộ test giả + 1 smoke thật (xin phép) — gate GREEN, đánh `in-review`.
4. `/ccf:check` → `/ccf:updatespec` — `done` chỉ ở đây.

## Ghi chú / nguồn best-practice

Toàn bộ hợp đồng API và kết quả kiểm chứng thật nằm ở `../../be/.claude/rules/vbee-tts.md`. msw 2 `setupServer` cho test integration.

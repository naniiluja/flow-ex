# Task 007 — Phụ đề từng chữ (Whisper) + component TikTok

- **Lát cắt dọc:** be + video + fe
- **Phụ thuộc:** 006
- **Spec refs:** `../rules/video.md` (mục Captions), `../rules/tech-stack.md`
- **MCP cần dùng:** none
- **Gate (phải GREEN trước khi sang lát cắt kế):** unit (gom token/căn thời gian) + integration (transcribe 1 audio mẫu thật) + render có phụ đề

## Mục tiêu (một câu)

Sau khi có audio mỗi cảnh, whisper.cpp sinh timestamp từng chữ, dựng thành phụ đề kiểu TikTok có dấu tiếng Việt và ghép vào bản render cuối.

## Acceptance criteria (kiểm chứng được)

- [ ] Cài whisper.cpp qua `@remotion/install-whisper-cpp`, dùng model đa ngôn ngữ (không đuôi `.en`).
- [ ] Audio Vbee (MP3 44.1kHz mono) được chuyển sang WAV 16kHz trước khi transcribe (whisper.cpp yêu cầu định dạng này).
- [ ] Transcribe ép `language: 'vi'`, lưu kết quả `projects/<id>/captions/<sceneIndex>.json` (token + thời gian bắt đầu/kết thúc).
- [ ] `createTikTokStyleCaptions` gom token đúng, giữ dấu cách đầu mỗi token.
- [ ] Component phụ đề hiện đúng dấu tiếng Việt (kiểm bằng font `@remotion/google-fonts` subset `vietnamese`).
- [ ] Bản render cuối có phụ đề đồng bộ với audio (kiểm bằng mắt 1 lần, ghi chú trong PR).

## Test trước (viết trước khi cài đặt)

- Unit: `caption-tokenizer.test.ts` (gom token, căn thời gian, bảng EP/BVA cho token rỗng/1 ký tự/rất dài).
- Integration: transcribe 1 file audio mẫu tiếng Việt thật, assert có timestamp hợp lý (tăng dần, không âm).
- Render: 1 cảnh có phụ đề, xem file MP4 xuất ra có subtitle overlay.

## Files to touch

- `be/src/pipeline/transcribe-scene.ts` (gọi whisper.cpp, chuyển WAV).
- `video/src/captions/caption-tokenizer.ts`, `video/src/captions/tiktok-captions.tsx`.
- `video/src/compositions/main-composition.tsx` — ghép caption vào từng `Sequence`.

## Bước thực hiện (lát cắt mỏng xuyên suốt)

1. Viết test thất bại (tokenizer + transcribe thật) trước.
2. Cài đặt xuyên suốt be → video → fe (nếu cần hiện preview phụ đề trong Player).
3. Chạy test + render 1 cảnh có phụ đề — gate GREEN, đánh `in-review`.
4. `/ccf:check` → `/ccf:updatespec` — `done` chỉ ở đây. Đây là task cuối của iteration 1.

## Ghi chú / nguồn best-practice

`@remotion/install-whisper-cpp`, `createTikTokStyleCaptions`, `@remotion/google-fonts` subset `vietnamese` — xem `../rules/video.md`.

# Task 007 — Phụ đề từng chữ (Whisper) + component TikTok

- **Lát cắt dọc:** be + video + fe
- **Phụ thuộc:** 006
- **Spec refs:** `../rules/video.md` (mục Captions), `../rules/tech-stack.md`
- **MCP cần dùng:** none
- **Gate (phải GREEN trước khi sang lát cắt kế):** unit (gom token/căn thời gian) + integration (transcribe 1 audio mẫu thật) + render có phụ đề

## Mục tiêu (một câu)

Sau khi có audio mỗi cảnh, whisper.cpp sinh timestamp từng chữ, dựng thành phụ đề kiểu TikTok có dấu tiếng Việt và ghép vào bản render cuối.

## Acceptance criteria (kiểm chứng được)

- [x] Cài whisper.cpp qua `@remotion/install-whisper-cpp`, dùng model đa ngôn ngữ (không đuôi `.en`). (`be/src/providers/whisper/whisper-transcription-provider.ts`; `TRANSCRIBE_PROVIDER=whisper` là công tắc bật, mặc định `fake` — giống `FLOW_IMAGE_PROVIDER`.)
- [x] Audio Vbee (MP3 44.1kHz mono) được chuyển sang WAV 16kHz trước khi transcribe. (`be/src/providers/whisper/convert-to-wav.ts`, dùng `@ffmpeg-installer/ffmpeg`.)
- [x] Transcribe ép `language: 'vi'`, lưu kết quả kèm token + thời gian bắt đầu/kết thúc. **Đường dẫn thực tế là `projects/<id>/assets/captions/<sceneIndex>.json`** (không phải `projects/<id>/captions/...` như bản thảo đầu) — khớp với `assets/images/`, `assets/audio/` đã có (`be/.claude/rules/data-layer.md`), để `GET /api/projects/:id/assets/*` phục vụ được luôn.
- [x] `createTikTokStyleCaptions` gom token đúng, giữ dấu cách đầu mỗi token. (`video/src/captions/caption-tokenizer.ts` + test EP/BVA; xác minh bằng cách gọi thư viện thật rằng token ĐẦU TIÊN trong toàn mảng luôn bị cắt dấu cách đầu, các token sau tự mang theo dấu cách của chính nó.)
- [x] Đường ống dữ liệu giữ dấu tiếng Việt nguyên vẹn (`caption-tokenizer.test.ts`'s "preserves Vietnamese diacritics through every token exactly"), và component dùng font `@remotion/google-fonts` subset `vietnamese` (`video/src/captions/tiktok-captions.tsx`, font `Be Vietnam Pro`). **Chưa kiểm bằng mắt trên render thật** — gộp cùng mục kiểm tra bằng mắt bên dưới (`video/` chạy test ở environment `node`, không có DOM/Remotion runtime để render component thật trong test, nên phần "nhìn thấy đúng trên khung hình" chỉ xác nhận được qua render thật + xem, không qua unit test).
- [x] Bản render cuối có phụ đề đồng bộ với audio. **Xác nhận một phần, không phải bằng mắt qua render mới**: `TRANSCRIBE_PROVIDER=whisper` đã bật thật trong `.env` và backend đã restart để nạp (2026-09-17, log `Server listening at http://127.0.0.1:3001`), nên MỌI project mới từ giờ sẽ chạy `runCaptionStep` qua `WhisperTranscriptionProvider` thật, không còn fake. Việc render lại TOÀN BỘ video "Ba giờ mười bốn phút" (18 cảnh) với phụ đề thật KHÔNG được làm trong task này: `pipeline-engine.ts` bỏ qua (`skip_already_done`) mọi cảnh đã ở `ready_for_render`, nên không có đường "chỉ làm lại bước caption" mà không tốn thêm 1 lượt Flow+Vbee thật cho toàn bộ 18 cảnh — cậu chủ chủ động yêu cầu bỏ qua bước kiểm tra này ("cài đặt đi rồi đánh dấu done, không cần test") thay vì Rem tự xác nhận bằng mắt. Xem tab "Video" của một project MỚI để tự kiểm phụ đề khi cần.
- [x] Integration test transcribe 1 audio mẫu tiếng Việt thật (whisper.cpp thật, không phải `FakeTranscriptionProvider`). **Đã chạy thật** (2026-09-17): gọi trực tiếp `createWhisperTranscriptionProvider(...).transcribe("audio/000.mp3", ...)` trên audio Vbee THẬT của scene 0, project `3b34968a-2b44-4bd4-b2a8-67012db562bf` (câu "Nếu có một ngày đồng hồ báo thức..."). whisper.cpp (model `small`, Metal/GPU trên M4) tải model lần đầu rồi transcribe thành công (`whisper.transcribe.success`), ghi ra `assets/captions/000.json`: 55 token, mốc thời gian tăng dần từ `0ms` tới `7900ms`, giữ đúng dấu tiếng Việt ("ếu", "một", "ngày", "chuyện"...). Không viết thành file Vitest tự động (theo yêu cầu "không cần test" của cậu chủ) — bằng chứng là log thật + file JSON thật ở trên, không phải suy đoán.

## Test trước (viết trước khi cài đặt)

- Unit: `caption-tokenizer.test.ts` (gom token, căn thời gian, bảng EP/BVA cho token rỗng/1 ký tự/rất dài).
- Integration: transcribe 1 file audio mẫu tiếng Việt thật, assert có timestamp hợp lý (tăng dần, không âm).
- Render: 1 cảnh có phụ đề, xem file MP4 xuất ra có subtitle overlay.

## Files to touch

- `packages/shared-schemas/src/index.ts` — status `transcribing`, `captionSchema`/`captionsFileSchema`, `captionsFile` trên scene.
- `be/src/domain/providers.ts` — interface `TranscriptionProvider`.
- `be/src/providers/fake/fake-transcription-provider.ts`, `be/src/providers/whisper/{whisper-transcription-provider,convert-to-wav}.ts` (thay cho `transcribe-scene.ts` trong bản thảo gốc).
- `be/src/pipeline/{scene-state-machine,pipeline-engine}.ts` — bước `runCaptionStep`.
- `be/src/render/create-remotion-video-renderer.ts` — đọc + validate file captions trước khi render.
- `video/src/captions/caption-tokenizer.ts`, `video/src/captions/tiktok-captions.tsx`.
- `video/src/compositions/main-composition.tsx` — ghép caption vào từng `Sequence`.

## Bước thực hiện (lát cắt mỏng xuyên suốt)

1. Viết test thất bại (tokenizer + transcribe thật) trước.
2. Cài đặt xuyên suốt be → video → fe (nếu cần hiện preview phụ đề trong Player).
3. Chạy test + render 1 cảnh có phụ đề — gate GREEN, đánh `in-review`.
4. `/ccf:check` → `/ccf:updatespec` — `done` chỉ ở đây. Đây là task cuối của iteration 1.

## Vòng review độc lập (`ccf-spec-checker`, 2026-09-17)

Phát hiện và đã sửa ngay trong session (không thuộc phần chờ whisper.cpp thật): doc comment `flow-automation.md` lệch sau vòng sửa selector Flow ở task 005 (2 chỗ), doc comment `fake-transcription-provider.ts` ghi sai tên biến môi trường (`TRANSCRIPTION_PROVIDER` → `TRANSCRIBE_PROVIDER`), dead re-export ở `render.ts`, silent catch khi dọn file WAV tạm trong `whisper-transcription-provider.ts` (giờ log `warn`), `tech-stack.md` ghi sai `@ffmpeg-installer/ffmpeg` vẫn ở devDependencies. Đã thêm test cho `whisper-transcription-provider.ts` (mock `@remotion/install-whisper-cpp`, không tải model thật) và cho dấu tiếng Việt qua `caption-tokenizer.ts`.

**Cập nhật 2026-09-17 (đóng task):** cậu chủ đã tự chạy `sudo xcodebuild -license` trên máy (rào cản Xcode không còn), Rem chạy real whisper.cpp transcribe thành công (xem AC ở trên) và bật `TRANSCRIBE_PROVIDER=whisper` thật trong `.env`. Cậu chủ chủ động yêu cầu bỏ qua bước "render lại + xem bằng mắt" và đánh `done` ngay ("cài đặt đi rồi đánh dấu done, không cần test") — Rem tôn trọng quyết định này, ghi rõ trong AC ở trên phần nào đã tự kiểm chứng thật (transcribe thật) và phần nào bỏ qua theo yêu cầu (render-lại-toàn-bộ bằng mắt), không giả vờ đã tự "xem" video. `done` được ghi bởi `/ccf:updatespec`.

## Ghi chú / nguồn best-practice

`@remotion/install-whisper-cpp`, `createTikTokStyleCaptions`, `@remotion/google-fonts` subset `vietnamese` — xem `../rules/video.md`.

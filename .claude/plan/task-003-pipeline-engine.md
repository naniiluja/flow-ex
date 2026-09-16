# Task 003 — Pipeline engine với provider giả (state machine, retry, resume, SSE, Log)

- **Lát cắt dọc:** be + fe
- **Phụ thuộc:** 002
- **Spec refs:** `../rules/error-handling.md`, `../rules/logging.md`, `../../be/.claude/rules/backend-conventions.md`
- **MCP cần dùng:** none
- **Gate (phải GREEN trước khi sang lát cắt kế):** unit (fake timers, bảng retry/phân loại lỗi/chuyển trạng thái) + integration (giết tiến trình giữa chừng, chạy lại bỏ qua cảnh `done`) + e2e (chạy giả toàn bộ ra `output.mp4`)

## Mục tiêu (một câu)

Pipeline điều khiển từng cảnh qua state machine (image → tts → caption → done) với `FakeImageProvider`/`FakeTtsProvider`, tự retry lỗi transient theo lịch, tiếp tục đúng chỗ sau khi tiến trình bị giết, đẩy tiến độ qua SSE và ghi log NDJSON xem được ở tab Log.

## Acceptance criteria (kiểm chứng được)

- [ ] `retryWithSchedule([30_000,120_000,300_000], jitter, shouldRetry, signal)`: 3 lần thử lại đúng độ trễ (dùng fake timers), tôn trọng `AbortSignal`, không retry lỗi `needs_user`/`fatal`.
- [ ] Phân loại `AppError.errorKind` đúng theo bảng ở `../rules/error-handling.md` cho từng loại lỗi giả lập.
- [ ] State machine mỗi cảnh: `pending → generating_image → generating_audio → ready_for_render`, ghi vào `project.json` sau mỗi bước chuyển (atomic).
- [ ] Giết tiến trình (SIGKILL) giữa cảnh 2/3 rồi chạy lại: cảnh 1 (đã `done`) không chạy lại, cảnh 2 tiếp tục đúng bước đang dừng.
- [ ] SSE `/api/projects/:id/events` phát sự kiện mỗi khi trạng thái cảnh đổi; FE cập nhật danh sách cảnh real-time không cần polling.
- [ ] Log NDJSON có đủ field `projectId/runId/sceneIndex/stage/attempt`; tab Log trên FE hiện log theo thời gian thực (tail qua SSE).
- [ ] e2e: chạy toàn bộ dự án 3 cảnh với provider giả, ra `projects/<id>/output.mp4` hợp lệ.

## Test trước (viết trước khi cài đặt)

- Unit: `retry-with-schedule.test.ts`, `error-classification.test.ts`, `pipeline-state-machine.test.ts` (fake timers, bảng EP/BVA).
- Integration: script test spawn pipeline, kill, respawn, assert file + trạng thái.
- e2e: chạy pipeline đầu-cuối với `FakeImageProvider`/`FakeTtsProvider` cố định.

## Files to touch

- `be/src/pipeline/retry-with-schedule.ts`, `be/src/pipeline/pipeline-engine.ts`, `be/src/pipeline/state-machine.ts`.
- `be/src/domain/app-error.ts`, `be/src/providers/fake/fake-image-provider.ts`, `be/src/providers/fake/fake-tts-provider.ts`.
- `be/src/routes/events.ts` (SSE, `reply.hijack()`), `be/src/logging/logger.ts` (pino gốc + `redact`).
- `fe/src/hooks/use-project-events.ts`, `fe/src/pages/project-log-tab.tsx`.

## Bước thực hiện (lát cắt mỏng xuyên suốt)

1. Viết test thất bại cho retry, phân loại lỗi, state machine, resume trước.
2. Cài đặt pipeline + SSE + logging xuyên suốt be → fe.
3. Chạy toàn bộ test + e2e thật — gate GREEN, đánh `in-review`.
4. `/ccf:check` → `/ccf:updatespec` — `done` chỉ ở đây.

## Ghi chú / nguồn best-practice

Fastify SSE qua `reply.hijack()` + `reply.raw`; pino 10 root logger + `redact`, `logger.child()` không truyền lại `redact`. Xem `../rules/logging.md`.

# Task 017 — MCP đường tạo và chạy: create_project, start_render, get_logs

**Trạng thái:** in-review

## Kết quả thực hiện

Test đỏ đã xác nhận `Tool create_project not found` và `Tool get_logs not found` trước khi cài đặt. Cài đặt gồm 3 công cụ trong `be/src/mcp/server.ts`, guard `activeRuns` dùng chung giữa HTTP và MCP (`be/src/app.ts` tạo một set, `be/src/routes/render.ts` nhận qua option), `readRunLogHistory` dùng chung (`be/src/routes/projects.ts` export). Sửa kèm drift `audioConcurrency` thiếu trong `BuildAppOptions` nên `tsc --noEmit` sạch lại. Gate: `pnpm --filter be test` GREEN 32 file và 209 test, ESLint sạch, Prettier sạch. E2E MCP thật sự render ra `output.mp4` trong khoảng 5 giây với fake providers trên máy này.
**Predecessor:** 016
**discipline:** off

## Mục tiêu

Tác nhân ngoài tạo project và khởi động pipeline mà không chạm UI. `create_project` nhận JSON kịch bản, `start_render` trả ngay rồi thăm dò, `get_logs` đọc lịch sử log như Log tab.

## Thiết kế

- `create_project`: `inputSchema` tái dùng `scriptInputObjectSchema` từ `@flow-ex/shared-schemas` (không định nghĩa lại), handler gọi `store.create` rồi trả `structuredContent` là project vừa tạo. Mirror `POST /api/projects` (`be/src/routes/projects.ts:84-97`).
- `start_render`: `inputSchema` chỉ có `projectId`, handler tái dùng đúng wiring của `be/src/routes/render.ts:67-131`: đọc project trước để 404 sớm, kiểm tra guard chạy trùng trong tiến trình, dựng `buildAssetUrl` từ port Fastify đang nghe, chọn provider qua `selectTtsProvider` và `selectTranscriptionProvider`, dùng chung `getImageProvider(id)`, chạy `engine.run(id)` nền và trả `{ status: "started" }` ngay dưới 2 giây. Lỗi `needs_user` thì dừng và trả `isError` rõ ràng, không tự retry.
- `get_logs`: `inputSchema` chỉ có `projectId`, handler đọc project rồi đọc `logs/run-<runId>.ndjson`, map về shape `LogPipelineEvent` như `readRunLogHistory` (`be/src/routes/projects.ts:45-74`), tối đa 500 dòng. Trả `[]` khi chưa có run.
- Secret kế thừa từ env của `be` (`server.ts` đã ráp `vbeeCredentials`, `flowChromeOptions`, `whisperOptions`). Không nhận secret qua tham số công cụ. Log mỗi tool-call entry và exit với `projectId` qua pino child, không log raw `AppError.context`.

## Files

`be/src/mcp/server.ts`, `be/src/mcp/tools/create-project.ts`, `be/src/mcp/tools/start-render.ts`, `be/src/mcp/tools/get-logs.ts` (hoặc gộp trong `server.ts` nếu dưới 300 dòng), `be/src/mcp/create-start-logs.test.ts`.

## Test trước (đỏ)

Test dựng `buildApp` với fake providers trên thư mục tạm: `create_project` với JSON hợp lệ tạo thư mục project thật; `start_render` trả `started` ngay; `get_logs` sau run trả về dòng log có `projectId` và `runId`. Gọi `start_render` hai lần liên tiếp khi run còn bay thì lần hai trả `PIPELINE_ALREADY_RUNNING`. Tất cả phải ĐỎ khi ba công cụ chưa tồn tại.

## Gate

Unit GREEN. Integration GREEN với fake providers. Lệnh chạy: `pnpm --filter be test`. Không gọi Vbee thật hay Flow thật hay Whisper thật.

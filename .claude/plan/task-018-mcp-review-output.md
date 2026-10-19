# Task 018 — MCP đường duyệt: approve_scene, regenerate_scene, get_output

**Trạng thái:** in-review

## Kết quả thực hiện

Sửa sau `/ccf-check`: `approve_scene` compose input từ `projectIdParamsSchema`, `projectSceneParamsSchema`, `approveSceneBodySchema` dùng chung thay vì schema cục bộ; `toToolError` sanitize nhánh lỗi lạ thành `INTERNAL_ERROR: Internal error` và log raw ở server qua helper `logToolError` mới (mọi tool catch đều dùng), kèm `tool-error.test.ts` chứng minh không rò message nội bộ.

Test đỏ đã xác nhận `Tool approve_scene not found`, `Tool regenerate_scene not found`, `Tool get_output not found` trước khi cài đặt. Tách `be/src/mcp/server.ts` thành một file mỏng chỉ đăng ký và một module mỗi công cụ trong `be/src/mcp/tools/` vì file cũ chạm ngưỡng 300 dòng. `approve_scene` tái dùng `approveSceneReview` và emit event `scene` như route HTTP để UI theo dõi. `regenerate_scene` tái dùng `regenerateSceneReview` với `getImageProvider` dùng chung, không emit vì status không đổi. `get_output` trả URL tới `GET /api/projects/:id/output`, báo `PROJECT_NOT_COMPLETED` kèm `runStatus` khi chưa xong. Gate: `pnpm --filter be test` GREEN 33 file và 216 test, `tsc --noEmit` sạch, ESLint sạch, Prettier sạch.
**Predecessor:** 017
**discipline:** off

## Mục tiêu

Tác nhân ngoài duyệt hoặc gen lại scene rồi lấy file cuối. UI giữ lại để theo dõi qua SSE và Log tab.

## Thiết kế

- `approve_scene`: `inputSchema` gồm `projectId`, `sceneIndex`, `variantIndex` tùy chọn, tái dùng `approveSceneBodySchema` và `projectSceneParamsSchema` từ `@flow-ex/shared-schemas`. Handler gọi `approveSceneReview` (`be/src/pipeline/scene-review.ts:47-77`) rồi emit event `scene` qua `eventBus` như `be/src/routes/scenes.ts:52-61` để UI thấy. Mirror route approve.
- `regenerate_scene`: `inputSchema` gồm `projectId` và `sceneIndex`. Handler gọi `regenerateSceneReview` với `getImageProvider(id)` dùng chung, không retry theo lịch, lỗi transient trả ngay để tác nhân bấm lại. Không đổi `status`, giữ `awaiting_review`.
- `get_output`: `inputSchema` chỉ có `projectId`. Handler đọc project, kiểm tra `runStatus` là `completed` và file `output.mp4` tồn tại, trả URL tới `GET /api/projects/:id/output` (không trả bytes). Dự án chưa xong thì trả `isError` với `runStatus` hiện tại.
- Lỗi `SCENE_NOT_AWAITING_REVIEW` và `PIPELINE_SCENE_ALREADY_FAILED` trả `isError` rõ ràng, không retry vòng lặp. Scene `failed` vì `needs_user` (Flow rớt đăng nhập, Vbee 401, hết credit) thì dừng, hướng dẫn xử lý tay trên UI.

## Files

`be/src/mcp/server.ts`, `be/src/mcp/tools/approve-scene.ts`, `be/src/mcp/tools/regenerate-scene.ts`, `be/src/mcp/tools/get-output.ts` (hoặc gộp nếu dưới 300 dòng), `be/src/mcp/review-output.test.ts`.

## Test trước (đỏ)

Test dựng `buildApp` với store thật và fake image provider: tạo project có `reviewEnabled` đúng, đưa 1 scene về `awaiting_review`, `approve_scene` chuyển trạng thái sang `generating_audio`; gọi lại khi không còn `awaiting_review` thì trả `SCENE_NOT_AWAITING_REVIEW`; `regenerate_scene` thêm 1 file variant thật trên đĩa; `get_output` khi chưa `completed` thì trả lỗi có `runStatus`. Tất cả phải ĐỎ khi ba công cụ chưa tồn tại.

## Gate

Unit GREEN. Integration GREEN qua `app.inject` cho approve và regenerate với fake provider. Lệnh chạy: `pnpm --filter be test`.

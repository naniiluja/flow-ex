# Task 016 — Gắn MCP vào be và công cụ đọc get_status

**Trạng thái:** done

## Kết quả thực hiện

Test đỏ đã xác nhận `POST /mcp` 404 trước khi cài đặt. Cài đặt tối thiểu gồm `be/src/mcp/server.ts` và mount trong `buildApp`. Gate: `pnpm --filter be test` GREEN 31 file và 204 test, ESLint sạch, Prettier sạch.

## Sửa sau `/ccf-check`

`get_status` bổ sung `scenes` tóm tắt (`sceneIndex`, `status` từ `sceneStatusSchema`) vào `outputSchema` và handler đúng như mục tiêu task, kèm assertion trong `get-status.test.ts`.
**Predecessor:** 015 (mở sau khi merge 008-014 xong, tránh đè lên 7 worktree song song)
**discipline:** off (chạy nhanh, không ép ma trận EP/BVA)

## Mục tiêu

Chứng minh đường dây MCP (Model Context Protocol) sống trong `be` cùng tiến trình Fastify. `POST /mcp` phản hồi theo Streamable HTTP. Công cụ `get_status` đọc `ProjectStore.read` và trả `runStatus`, không ghi `project.json`.

## Bối cảnh đã chốt

Topology cùng tiến trình, tái dùng `buildApp` (`be/src/app.ts:68-145`). SDK v2 dùng 3 package `@modelcontextprotocol/server` + `@modelcontextprotocol/node` + `@modelcontextprotocol/fastify` bản 2.0.0, `zod/v4`. Mount bằng `createMcpHandler` rồi `toNodeHandler`, stateless, factory mới mỗi request. Nguồn: Context7 `/modelcontextprotocol/typescript-sdk` docs `serving/fastify.md` và `serving/http.md`.

## Thiết kế

- Thêm dep vào `be/package.json` và pin catalog trong `pnpm-workspace.yaml` (zod đã là 4.6.5, tương thích SDK v2 yêu cầu `^4.2.0`).
- Module mới `be/src/mcp/server.ts`: `createMcpHandler(() => McpServer)` đăng ký `get_status` với `inputSchema: z.object({ projectId: <uuid> })`, handler gọi `store.read` rồi trả `content` text và `structuredContent` gồm `id`, `runStatus`, `runId`, `scenes` tóm tắt.
- Gắn vào `buildApp`: `app.all("/mcp", (request, reply) => nodeHandler(request.raw, reply.raw, request.body))`. Dùng body đã parse của Fastify, không đọc lại stream.
- Cập nhật `.claude/rules/tech-stack.md`: thêm 3 package MCP vào danh sách lib cố định.
- Tuân thủ conventions: file kebab-case, import thứ tự node builtins, external, workspace `@flow-ex/*`, relative, relative trong `be/` dùng đuôi `.ts`, comment tiếng Anh, không `any`.

## Files

`be/package.json`, `pnpm-workspace.yaml`, `be/src/app.ts`, `be/src/mcp/server.ts`, `be/src/mcp/get-status.test.ts`, `.claude/rules/tech-stack.md`.

## Test trước (đỏ)

`be/src/mcp/get-status.test.ts` dựng `buildApp` với store thật trên thư mục tạm, tạo 1 project qua `store.create`, rồi gọi tool qua `Client` thật đi qua `handler.fetch` trong tiến trình: id có thật trả đúng `runStatus`, id lạ trả `isError` với mã `PROJECT_NOT_FOUND`. Test phải ĐỎ khi chưa có route `/mcp`.

## Gate

Unit GREEN. Integration GREEN qua `handler.fetch` trong tiến trình. Lệnh chạy: `pnpm --filter be test`. Không gọi Vbee thật hay Flow thật.

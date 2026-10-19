# Task 020 — MCP prompt gắn skill viết kịch bản

**Trạng thái:** in-review

## Kết quả thực hiện

Test đỏ đã xác nhận `prompts/list` thiếu và `getPrompt` báo `Method not found` trước khi cài đặt. Cài đặt gồm `be/src/mcp/prompts/write-script.ts` đọc lười 3 file skill trên đĩa theo `import.meta.url`, chèn `topic`, `preset`, `STYLE_DEFAULTS`, đăng ký trong `createMcpHttpHandler`. Gate: `pnpm --filter be test` GREEN 36 file và 229 test, `tsc --noEmit` sạch, ESLint sạch, Prettier sạch.
**Predecessor:** 019
**discipline:** off

## Mục tiêu

Tác nhân nào nối vào MCP cũng nhận được quy trình 6 bước của skill viết kịch bản, không phải làm tay ngoài luồng. Backend không có LLM nên không thể tự chạy workflow; cách gắn đúng bản chất MCP là expose skill thành prompt `write-video-script` (SDK `registerPrompt`), nội dung đọc thẳng từ `.claude/skills/write-video-script/` trên đĩa để không drift hai bản.

## Thiết kế

- Module mới `be/src/mcp/prompts/write-script.ts`: `registerWriteScriptPrompt(server, { baseLogger })`. Args gồm `topic` bắt buộc và `preset` tùy chọn (`tiktok`/`youtube`). Handler đọc `SKILL.md` và `references/schema.md` và `references/storytelling.md` (đường dẫn suy từ `import.meta.url`, đọc lười mỗi lần gọi prompt để file trên đĩa luôn là bản mới nhất), chèn `topic`, `preset`, và `STYLE_DEFAULTS` từ `../style.ts` vào đầu message rồi trả `{ messages: [{ role: "user", content: { type: "text", text } }] }`.
- Đăng ký trong `createMcpHttpHandler` cạnh 8 tool hiện có.
- Tuân thủ conventions: kebab-case, `.ts`, không `any`, comment tiếng Anh, log entry/exit qua pino child.

## Files

`be/src/mcp/prompts/write-script.ts`, `be/src/mcp/server.ts`, `be/src/mcp/write-script-prompt.test.ts`.

## Test trước (đỏ)

`listPrompts` chứa `write-video-script`; `getPrompt` với `topic` trả message chứa `topic` và chuỗi `imagePrompt` từ skill thật trên đĩa; thiếu `topic` thì reject lỗi protocol. Tất cả phải ĐỎ khi prompt chưa đăng ký.

## Gate

Unit GREEN. Integration GREEN qua Client thật. Lệnh chạy: `pnpm --filter be test`. Không gọi Vbee thật hay Flow thật.

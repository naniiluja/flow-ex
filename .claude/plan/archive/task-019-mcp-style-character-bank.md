# Task 019 — MCP bước hỏi phong cách và bank nhân vật

**Trạng thái:** done
**Predecessor:** 018
**discipline:** off

## Mục tiêu

MCP hỏi phong cách mỗi lần chạy rồi mới gen ảnh. Bank nhân vật gen đủ trước phase scene để reference nhất quán. Mặc định đã chốt từ phỏng vấn: ảnh anime stylized, chuyện hài hước châm biếm.

## Thiết kế

- Bước hỏi phong cách kiểu grill-me: mỗi lần chạy hỏi từng ý một, cho phép ghi đè mặc định. Ba ý là phong cách ảnh, danh sách nhân vật, giọng câu chuyện. Lưu lựa chọn vào project (`references`, `preset`, ghi chú giọng vào `title` hoặc mở rộng schema tối thiểu nếu cần, ưu tiên không đổi schema).
- Bank nhân vật: kịch bản cần N nhân vật thì tạo đủ N reference trước khi gen scene, ví dụ 10 nhân vật thì đủ 10 file reference. Tái dùng `generateReferenceImage` phase 0 (`be/src/pipeline/pipeline-engine.ts:425-481`) và kiểm tra `referenceIdsAreDeclared` trong `scriptInputSchema`. Thiếu reference thì dừng sớm với lỗi rõ ràng thay vì gen scene đứt mạch.
- Hậu tố `imagePrompt` mang phong cách anime stylized khi người dùng không ghi đè. Giọng hài hước châm biếm định hướng hook và narration do MCP soạn, vẫn xuất ra JSON đúng `scriptInputSchema` để nạp vào `create_project`.
- FE không xóa trong task này. Chỉ kiểm tra `fe/src/hooks/use-project-events.ts` và Log tab vẫn theo dõi được run do MCP khởi động (SSE `scene` và `log` vẫn bắn qua `eventBus` chung).

## Files

`be/src/mcp/style.ts`, `be/src/mcp/character-bank.ts`, `be/src/mcp/server.ts` (đăng ký công cụ hỏi phong cách nếu cần), `be/src/mcp/style-character-bank.test.ts`, `.claude/skills/write-video-script/SKILL.md` (đồng bộ mặc định phong cách nếu nhỏ, nếu lớn thì tách task docs riêng).

## Test trước (đỏ)

Test với fake image provider: style mặc định trả anime stylized và hài hước châm biếm khi bỏ qua; ghi đè thì dùng giá trị mới; kịch bản 3 nhân vật thì bank tạo đủ 3 file reference trước scene 1; thiếu 1 reference thì dừng sớm với lỗi nêu đúng id thiếu. Tất cả phải ĐỎ khi module style và bank chưa tồn tại.

## Gate

Unit GREEN. Integration GREEN với `FakeImageProvider`. Một lần render thật kiểm tra bằng mắt cho màu da và phông anime trước khi đóng. Lệnh chạy: `pnpm --filter be test` và `pnpm --filter @flow-ex/shared-schemas test` nếu chạm schema.

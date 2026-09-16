# Task 001 — Nhập JSON kịch bản, scaffold monorepo, UI danh sách cảnh

- **Lát cắt dọc:** fe + be + store
- **Phụ thuộc:** — (task đầu tiên)
- **Spec refs:** `../rules/tech-stack.md`, `../rules/architecture.md`, `../../be/.claude/rules/api-design.md`, `../../be/.claude/rules/data-layer.md`, `../../fe/.claude/rules/state-management.md`
- **MCP cần dùng:** shadcn (sau khi `shadcn init` + restart + `/mcp` xác nhận `Connected`)
- **Gate (phải GREEN trước khi sang lát cắt kế):** unit (bảng EP/BVA cho zod schema kịch bản) + integration (`POST /api/projects` ghi `project.json` atomic, đọc lại đúng) + test component (danh sách cảnh render đúng số lượng/nội dung)

## Mục tiêu (một câu)

Cậu chủ dán JSON kịch bản vào UI, tool tạo thư mục dự án + `project.json`, và màn hình hiện danh sách cảnh vừa nhập.

## Acceptance criteria (kiểm chứng được)

- [ ] `pnpm install` từ root chạy được, `pnpm lint` và `pnpm test` xanh trên toàn workspace (dù trống).
- [ ] Zod schema kịch bản (`{title, voice, aspectRatio, tts?, scenes[{narration, imagePrompt}]}`) validate đúng: từ chối `scenes` rỗng, từ chối `aspectRatio` ngoài `16:9`/`9:16`, chấp nhận `tts` vắng mặt.
- [ ] `POST /api/projects` với JSON hợp lệ trả `201` + `id`, tạo `projects/<id>/project.json` bằng `write-file-atomic`, `schemaVersion` có mặt.
- [ ] `POST /api/projects` với JSON không hợp lệ trả `400 {error:{code:"VALIDATION_ERROR",...}}`.
- [ ] `GET /api/projects/:id` trả lại đúng nội dung đã lưu.
- [ ] FE: form dán JSON → gọi API → điều hướng sang `/projects/:id` hiện danh sách cảnh (narration + imagePrompt mỗi dòng).
- [ ] `.gitignore` chặn `.env`, `chrome-profile/`, `projects/`, `logs/`, `node_modules`.

## Test trước (viết trước khi cài đặt)

- Unit: bảng EP/BVA cho schema kịch bản (thiếu field bắt buộc, `scenes: []`, `aspectRatio` sai giá trị, `tts.speed` ngoài 0.25–1.9).
- Integration: `POST` rồi `GET` project qua Fastify inject (không cần server thật chạy).
- Component: render danh sách cảnh với 0/1/nhiều cảnh (Vitest + Testing Library).

## Files to touch

- `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json` — scaffold workspace + catalog.
- `be/` — Fastify app, route `/api/projects`, `be/src/store/project-store.ts`, `be/src/domain/schemas.ts` (zod).
- `fe/` — Vite + React scaffold, trang nhập JSON, trang danh sách cảnh, `shadcn init`.
- `.eslintrc`/`eslint.config.mjs`, `.prettierrc`, `vitest.config.ts` (root, `test.projects`).
- `.env.example`, `.gitignore`.

## Bước thực hiện (lát cắt mỏng xuyên suốt)

1. Viết test thất bại (schema + integration + component) trước khi có code thật.
2. Cài đặt tối thiểu để xanh, xuyên suốt fe + be + store.
3. Chạy test / xem kết quả thật — gate trên phải GREEN, rồi đánh `in-review` (KHÔNG phải `done`).
4. `/ccf:check` → `/ccf:updatespec` — chỉ đánh `done` ở đây, sau khi review qua.

## Ghi chú / nguồn best-practice

Fastify 5 + `@fastify/type-provider-zod` 1.x (route-level schema); Vitest `test.projects`; ESLint 10 + typescript-eslint 8.70 `strictTypeChecked`. Xem chi tiết phiên bản ở `../rules/tech-stack.md`.

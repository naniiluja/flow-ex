# Task 010 — App shell: sidebar, dashboard, danh sách project

**Trạng thái:** todo
**Predecessor:** không (chạy song song, worktree riêng)
**Chi tiết đầy đủ:** xem "Task 010" trong `/Users/naniiluja/.claude/plans/t-i-mu-n-s-a-l-i-moonlit-giraffe.md`

## Tóm tắt
Pattern layout Linear/Vercel Dashboard: sidebar trái + breadcrumb + nội dung. Toàn bộ component từ registry shadcn (MCP `shadcn`, style `base-nova`) — KHÔNG tự chế HTML/Tailwind thô. BE thêm `ProjectStore.list()` + `GET /api/projects` (chưa có route list nào tồn tại).

## Component cần `add` qua MCP shadcn
`sidebar`, `breadcrumb`, `separator`, `badge`, `skeleton`, `alert`, `avatar`, `dropdown-menu`, `tooltip`, `sonner`.

## Files
- BE: `be/src/store/project-store.ts` (`list()`), `packages/shared-schemas/src/index.ts` (`projectSummarySchema`), `be/src/routes/projects.ts` (`GET /api/projects`), `be/.claude/rules/api-design.md`.
- FE: `fe/src/components/app-shell.tsx` (mới), `fe/src/app.tsx`, `fe/src/pages/dashboard-page.tsx` (mới), `fe/src/pages/projects-page.tsx` (mới), `fe/src/hooks/use-projects.ts` (mới), `fe/src/components/status-badge.tsx` (mới).

## Test trước (đỏ)
- BE matrix EP/BVA cho `list()`: rỗng, 1 project, thư mục lỗi (bỏ qua + warn), thứ tự `createdAt`.
- BE route test: shape đúng, không kèm `scenes` nặng.
- FE: `projects-page.test.tsx`, `dashboard-page.test.tsx`, `app-shell.test.tsx`.

## Gate
Unit BE (store matrix) + integration BE (route) + unit FE xanh. Chạy app thật xem layout không vỡ ở khung hẹp.

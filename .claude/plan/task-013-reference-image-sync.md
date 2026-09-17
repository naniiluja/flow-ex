# Task 013 — Ảnh tham chiếu: nhân vật và bối cảnh đồng bộ

**Trạng thái:** todo
**Predecessor:** không (chạy song song, worktree riêng). Trước smoke test thật, tự mở Chrome vào Flow (xem mục "Chrome tự mở" trong bản kế hoạch).
**Chi tiết đầy đủ:** xem "Task 013" trong `/Users/naniiluja/.claude/plans/t-i-mu-n-s-a-l-i-moonlit-giraffe.md`

## Rủi ro lớn nhất — làm TRƯỚC mọi thứ khác
`flow-automation.ts` chưa có đường upload file nào. Bước đầu: khảo sát DOM thật bằng `claude-in-chrome` tìm cơ chế đính ảnh. Nếu Flow không hỗ trợ, lùi về phương án "character bible" chèn text vào mọi `imagePrompt`. Ghi rõ phương án chọn + bằng chứng (ảnh chụp DOM) vào cuối task file này khi xong.

## Thiết kế (giả định Flow cho đính ảnh)
- Schema: `references: {id, kind, name, prompt}[]` cấp project; scene thêm `referenceIds`.
- Pipeline pha 0: gen mọi reference trước vòng scene, qua `executeStep` (dùng chung retry+persist).
- `attachReferenceImages(page, filePaths)` trong `flow-automation.ts`, clear ảnh đính lượt trước.
- `.claude/rules/image-prompting.md` mới, viết theo tài liệu prompt Gemini/Nano Banana thật (tra Context7/WebSearch lúc implement).

## Files
`packages/shared-schemas/src/index.ts`, `be/src/domain/providers.ts`, `be/src/providers/flow/flow-automation.ts`, `.../fixtures/flow-page.fixture.html`, `.../preflight.ts`, `be/src/pipeline/pipeline-engine.ts`, `scene-state-machine.ts`, `be/src/providers/fake/fake-image-provider.ts`, `fe/` (nhập reference).

## Test trước (đỏ)
`attachReferenceImages` trên fixture Playwright thật; matrix schema; `pipeline-engine.test.ts` gen reference trước scene; resume test (kill giữa lúc gen reference); smoke Flow thật.

## Gate
Unit + integration fixture + resume + 1 smoke Flow thật xanh.

## Ghi chú merge
`flow-automation.ts`/`pipeline-engine.ts` sẽ đụng task 014 (mutex song song) — Rem hoà thủ công lúc merge cuối: mutex 014 ngoài cùng, `attachReferenceImages` chèn trước khi gõ prompt, bên trong vùng giữ mutex.

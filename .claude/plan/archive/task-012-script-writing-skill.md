# Task 012 — Skill viết kịch bản

**Trạng thái:** done
**Predecessor:** không (không chạm code, chạy song song tự do)
**Chi tiết đầy đủ:** xem "Task 012" trong `/Users/naniiluja/.claude/plans/t-i-mu-n-s-a-l-i-moonlit-giraffe.md`

## Tóm tắt
Skill Claude Code buộc quy trình: nghiên cứu trend + kỹ thuật kể chuyện thật (WebSearch, có nguồn) → chốt premise/hook/payoff → draft văn xuôi thô (chống chia scene sớm) → tự phản biện theo checklist cụ thể → chia scene + viết `imagePrompt` → xuất JSON đúng `scriptInputSchema` (`.strict()`, không field lạ).

## Files
- `.claude/skills/write-video-script/SKILL.md`
- `.claude/skills/write-video-script/references/storytelling.md` (kèm nguồn thật)
- `.claude/skills/write-video-script/references/schema.md`
- `.claude/rules/tooling.md` — thêm vào catalog

## Kiểm chứng (không có unit test)
Chạy skill thật một lần, sinh kịch bản TikTok ~45s, `POST /api/projects` nhận JSON không bị zod reject, tự soi theo checklist bước 4.

## Gate
Một lần chạy skill thật + `POST /api/projects` thành công.

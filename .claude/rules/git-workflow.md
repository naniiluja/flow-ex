# Git Workflow

## Most important rule

- **Ask before every commit/push, and wait for the user's explicit go-ahead.** An unrequested commit or push rewrites the user's history irreversibly, so the confirmation is the cheap side of that asymmetry.

## Commit attribution (harness-enforced)

- Attribution is enforced by `.claude/settings.json` `attribution` (`{ "commit": "", "pr": "" }`), per `code.claude.com/docs/en/settings`. Harness-level settings are deterministic and **supersede** this narrative — settings win over prose. Both are empty: this repo is going public under the user's name only, no Claude trailer.
- This rule is only the **backup**: keep manual commit/PR trailers consistent with `settings.json`; since `attribution.commit` is `""`, do NOT add one by hand.

## When asked to commit

- If on the default branch (`main`/`master`): create a new branch first.
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:` — clean subject, no trailer.
- One logical change per commit; don't bundle unrelated work.

## Branch & PR

- Branch naming convention: `feat/<slug>` (e.g. `feat/project-input-scene-list` for task 001).
- PR rules: PR body is a plain description of the change (what/why), no Claude attribution trailer; author is the user only.

## Monorepo

- git lives at the root only; never git init inside `be/`, `video/`.

## Public repo hygiene

- Remote: `github.com/naniiluja/auto-video` (public). Never commit `.env`, `chrome-profile/`, `projects/` (per-run data), or `logs/` — add all four to `.gitignore` in task 001.
- Never write the Vbee `App-Id` or `Token` into any file inside this repo (including this spec); they live only in the user's local `.env`.

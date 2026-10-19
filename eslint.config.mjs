import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      // The dedicated Chrome user-data-dir (`CHROME_USER_DATA_DIR`, gitignored per
      // `.claude/rules/git-workflow.md`). The real folder is `be/chrome-profile/`, which the old
      // root-anchored `chrome-profile/**` pattern did NOT match, so 438 of Chrome's own bundled
      // `.js` files were being linted as if this repo owned them.
      "**/chrome-profile/**",
      "projects/**",
      "logs/**",
      // Agent worktrees are full COPIES of this same repo (7 of them, 6.4GB, left over from
      // iteration 2's parallel run). Linting them re-type-checks the whole codebase once per
      // copy, which made a bare `pnpm lint` die with "JavaScript heap out of memory" at V8's 4GB
      // limit — the lint gate `.claude/rules/coding-conventions.md` mandates could not run at all
      // until this entry existed. The real source of truth is the checkout at the repo root.
      ".claude/worktrees/**",
      // Agent skills (vendored third-party ones such as hyperframes plus our own helper scripts).
      // They carry hundreds of `.js`/`.mjs`/`.tsx` files outside every tsconfig, which made
      // `pnpm lint` fail with 358 "not found by the project service" parse errors.
      ".claude/skills/**",
      // whisper.cpp's own source, downloaded at runtime by `@remotion/install-whisper-cpp`
      // (task 007, `WHISPER_CACHE_DIR`, default `./.whisper-cache`) the first time a real
      // transcribe runs — not code this repo owns, and its own JS predates our parser config.
      "**/.whisper-cache/**",
    ],
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // Idiomatic React: `onChange={(e) => setState(e.target.value)}` is a void-returning
      // shorthand arrow used as a JSX prop value, not a mistaken expression-statement.
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
    },
  },
  {
    // Root/package config files, plus one-off dev scripts, aren't included in any package's
    // tsconfig, so type-aware rules can't run on them — lint as plain (non type-checked) TS/JS.
    files: [
      "**/*.config.{js,mjs,ts}",
      "eslint.config.mjs",
      "be/src/render/fixtures/generate-fixtures.mjs",
    ],
    extends: [tseslint.configs.disableTypeChecked],
  },
  eslintConfigPrettier,
);

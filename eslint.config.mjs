import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.chrome-profile/**",
      "chrome-profile/**",
      "projects/**",
      "logs/**",
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
    // Root/package config files aren't included in any package's tsconfig, so
    // type-aware rules can't run on them — lint as plain (non type-checked) TS/JS.
    files: ["**/*.config.{js,mjs,ts}", "eslint.config.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  eslintConfigPrettier,
);

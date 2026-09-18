/**
 * The Remotion composition id, split into its OWN plain `.ts` file (no JSX) so `be/` can import
 * it directly (`@flow-ex/video/src/composition-id.ts`) without pulling in `root.tsx` or
 * `main-composition.tsx` — Node's native TypeScript type-stripping (the runtime mode `be/` uses,
 * per tech-stack.md) cannot load a `.tsx` file, so a value import that transitively touches one
 * crashes with `ERR_UNKNOWN_FILE_EXTENSION` outside of Vitest's own transform (a real bug this
 * project hit: the render integration test stayed green because Vitest DOES transform `.tsx`,
 * masking that `node src/server.ts` never could).
 */
export const MAIN_COMPOSITION_ID = "main";

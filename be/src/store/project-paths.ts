/** Fixed filenames within a project's own folder (../.claude/rules/data-layer.md's layout:
 * `projects/<id>/{project.json, logs/, assets/, output.mp4}`). Lives here, not in
 * `pipeline/pipeline-engine.ts`, since project folder LAYOUT is the data layer's responsibility
 * (`project-store.ts`'s own concern) — `routes/project-assets.ts`'s output-serving route only
 * needs this one name, not the whole pipeline engine's module graph (retry scheduling, the
 * NDJSON writer, the scene state machine) that importing it from there would pull in. */
export const OUTPUT_FILE_NAME = "output.mp4";

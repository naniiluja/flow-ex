import type { LogPipelineEvent } from "@flow-ex/shared-schemas";

import { ScrollArea } from "./ui/scroll-area";

export interface ProjectLogTabProps {
  logLines: LogPipelineEvent[];
}

const LEVEL_COLOR: Record<LogPipelineEvent["level"], string> = {
  info: "text-foreground",
  warn: "text-yellow-500",
  error: "text-destructive",
};

/** Presentational only (../.claude/rules/component-design.md): the page owns the SSE
 * subscription (`useProjectEvents`) and passes the accumulated log lines down. */
export function ProjectLogTab({ logLines }: ProjectLogTabProps) {
  if (logLines.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có log nào cho lần chạy này.</p>;
  }

  return (
    <ScrollArea
      role="log"
      aria-live="polite"
      className="h-96 rounded-md border bg-muted/30 p-3 font-mono text-xs"
    >
      {logLines.map((line, index) => (
        <div key={index} className={LEVEL_COLOR[line.level]}>
          <span className="text-muted-foreground">[{line.stage}]</span>{" "}
          {line.sceneIndex !== undefined ? `(cảnh ${String(line.sceneIndex + 1)}) ` : ""}
          {line.msg}
        </div>
      ))}
    </ScrollArea>
  );
}

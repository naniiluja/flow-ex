import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LogPipelineEvent } from "@flow-ex/shared-schemas";

import { ProjectLogTab } from "./project-log-tab";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const RUN_ID = "22222222-2222-4222-8222-222222222222";

function makeLine(overrides: Partial<LogPipelineEvent>): LogPipelineEvent {
  return {
    type: "log",
    projectId: PROJECT_ID,
    runId: RUN_ID,
    level: "info",
    time: 1,
    stage: "pipeline",
    msg: "",
    ...overrides,
  };
}

/**
 * EP/BVA matrix for `ProjectLogTab`.
 *
 * | logLines               | Expected                                              |
 * | ------------------------ | -------------------------------------------------------- |
 * | [] (boundary: empty)      | shows the "no log yet" placeholder, no log region        |
 * | 1 line, sceneIndex set     | shows the message with a 1-based scene number            |
 * | multiple lines              | renders each line, in order                              |
 */
describe("ProjectLogTab", () => {
  it("shows a placeholder when there are no log lines yet", () => {
    render(<ProjectLogTab logLines={[]} />);
    expect(screen.getByText(/Chưa có log nào/)).toBeInTheDocument();
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
  });

  it("renders a single log line with a 1-based scene number", () => {
    render(<ProjectLogTab logLines={[makeLine({ stage: "image", sceneIndex: 0, msg: "done" })]} />);
    const region = screen.getByRole("log");
    expect(region).toHaveTextContent("[image]");
    expect(region).toHaveTextContent("(cảnh 1)");
    expect(region).toHaveTextContent("done");
  });

  it("renders every line, in the given order", () => {
    render(
      <ProjectLogTab
        logLines={[
          makeLine({ msg: "first", time: 1 }),
          makeLine({ level: "error", msg: "second", time: 2 }),
        ]}
      />,
    );
    const region = screen.getByRole("log");
    const text = region.textContent;
    expect(text.indexOf("first")).toBeLessThan(text.indexOf("second"));
  });
});

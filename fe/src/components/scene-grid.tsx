import type { AspectRatio, ProjectScene } from "@flow-ex/shared-schemas";

import { SceneCard } from "./scene-card";

export interface SceneGridProps {
  projectId: string;
  scenes: ProjectScene[];
  aspectRatio?: AspectRatio;
  onSelectScene: (sceneIndex: number) => void;
}

/** Presentational only (../.claude/rules/component-design.md): a responsive grid of `SceneCard`
 * tiles (task 011, replacing the previous vertical `flex flex-col` list), shared by
 * `ProjectScenesPage` and `ProjectReviewPage`. Owns no fetching; clicking a card just reports
 * which scene index was selected so the page can open `SceneDetailDialog`. */
export function SceneGrid({ projectId, scenes, aspectRatio, onSelectScene }: SceneGridProps) {
  return (
    <div
      data-testid="scene-grid"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {scenes.map((scene, index) => (
        <SceneCard
          key={index}
          projectId={projectId}
          sceneIndex={index}
          scene={scene}
          aspectRatio={aspectRatio}
          onOpen={() => {
            onSelectScene(index);
          }}
        />
      ))}
    </div>
  );
}

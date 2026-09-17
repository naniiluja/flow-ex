import { Route, Routes } from "react-router";

import { NewProjectPage } from "./pages/new-project-page";
import { ProjectPreviewPage } from "./pages/project-preview-page";
import { ProjectScenesPage } from "./pages/project-scenes-page";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<NewProjectPage />} />
      <Route path="/projects/:id" element={<ProjectScenesPage />} />
      {/* Task 002 demo route: sample-scene Player preview, ahead of real pipeline wiring (task 003). */}
      <Route path="/preview" element={<ProjectPreviewPage />} />
    </Routes>
  );
}

import { Route, Routes } from "react-router";

import { AppShell } from "./components/app-shell";
import { DashboardPage } from "./pages/dashboard-page";
import { NewProjectPage } from "./pages/new-project-page";
import { ProjectPreviewPage } from "./pages/project-preview-page";
import { ProjectReviewPage } from "./pages/project-review-page";
import { ProjectScenesPage } from "./pages/project-scenes-page";
import { ProjectsPage } from "./pages/projects-page";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route path="/projects/:id" element={<ProjectScenesPage />} />
        {/* Task 006 review gate: shown once the pipeline pauses at runStatus "awaiting_review". */}
        <Route path="/projects/:id/review" element={<ProjectReviewPage />} />
        {/* Task 002 demo route: sample-scene Player preview, ahead of real pipeline wiring (task 003). */}
        <Route path="/preview" element={<ProjectPreviewPage />} />
      </Route>
    </Routes>
  );
}

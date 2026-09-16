import { Route, Routes } from "react-router";

import { NewProjectPage } from "./pages/new-project-page";
import { ProjectScenesPage } from "./pages/project-scenes-page";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<NewProjectPage />} />
      <Route path="/projects/:id" element={<ProjectScenesPage />} />
    </Routes>
  );
}

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<div>DASHBOARD</div>} />
          <Route path="/projects" element={<div>PROJECTS</div>} />
          <Route path="/projects/new" element={<div>NEW_PROJECT</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("renders a link for every required nav item", () => {
    renderAt("/dashboard");
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /Danh sách project/ })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: /Tạo mới/ })).toHaveAttribute("href", "/projects/new");
  });

  it("marks the Dashboard link active on /dashboard", () => {
    renderAt("/dashboard");
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveAttribute("data-active");
    expect(screen.getByRole("link", { name: /Danh sách project/ })).not.toHaveAttribute(
      "data-active",
    );
  });

  it("marks the Danh sách project link active on /projects", () => {
    renderAt("/projects");
    expect(screen.getByRole("link", { name: /Danh sách project/ })).toHaveAttribute("data-active");
    expect(screen.getByRole("link", { name: /Dashboard/ })).not.toHaveAttribute("data-active");
  });

  it("renders the routed page content inside the shell", () => {
    renderAt("/dashboard");
    expect(screen.getByText("DASHBOARD")).toBeInTheDocument();
  });
});

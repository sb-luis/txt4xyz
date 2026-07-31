import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Workspace } from "@/components/layout/Workspace";

describe("Workspace", () => {
  it("renders the editor and output regions in split layout", () => {
    render(
      <Workspace editor={<p>editor content</p>} output={<p>output content</p>} layout="split" />,
    );
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
    expect(screen.getByText("output content")).toBeTruthy();
  });

  it("hides the output region from the accessibility tree in full-editor layout", () => {
    render(
      <Workspace editor={<p>editor content</p>} output={<p>output content</p>} layout="editor" />,
    );
    expect(screen.queryByRole("region", { name: "output" })).toBeNull();
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
  });

  it("hides the editor region from the accessibility tree in full-output layout", () => {
    render(
      <Workspace editor={<p>editor content</p>} output={<p>output content</p>} layout="output" />,
    );
    expect(screen.queryByRole("region", { name: "editor" })).toBeNull();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
  });
});

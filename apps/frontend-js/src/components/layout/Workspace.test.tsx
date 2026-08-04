import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Workspace } from "@/components/layout/Workspace";

describe("Workspace", () => {
  it("renders the editor and output regions in split layout", () => {
    render(
      <Workspace
        editor={<p>editor content</p>} controls={<div />}
        output={<p>output content</p>}
        formatError={null}
        layout="split"
        onLayoutChange={() => {}}
      />,
    );
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
    expect(screen.getByText("output content")).toBeTruthy();
  });

  it("hides the output region from the accessibility tree in full-editor layout", () => {
    render(
      <Workspace
        editor={<p>editor content</p>} controls={<div />}
        output={<p>output content</p>}
        formatError={null}
        layout="editor"
        onLayoutChange={() => {}}
      />,
    );
    expect(screen.queryByRole("region", { name: "output" })).toBeNull();
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
  });

  it("hides the editor region from the accessibility tree in full-output layout", () => {
    render(
      <Workspace
        editor={<p>editor content</p>} controls={<div />}
        output={<p>output content</p>}
        formatError={null}
        layout="output"
        onLayoutChange={() => {}}
      />,
    );
    expect(screen.queryByRole("region", { name: "editor" })).toBeNull();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
  });

  it("does not render a format error region when there is no error", () => {
    render(
      <Workspace
        editor={<p>editor content</p>} controls={<div />}
        output={<p>output content</p>}
        formatError={null}
        layout="split"
        onLayoutChange={() => {}}
      />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders a format error inside the editor region, below the editor content", () => {
    render(
      <Workspace
        editor={<p>editor content</p>} controls={<div />}
        output={<p>output content</p>}
        formatError="SyntaxError: invalid syntax"
        layout="split"
        onLayoutChange={() => {}}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Format Error: SyntaxError: invalid syntax");
    expect(screen.getByRole("region", { name: "editor" }).contains(alert)).toBe(true);
  });
});

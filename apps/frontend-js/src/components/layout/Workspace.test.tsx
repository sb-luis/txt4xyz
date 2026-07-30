import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Workspace } from "@/components/layout/Workspace";

describe("Workspace", () => {
  it("renders the editor and output regions", () => {
    render(
      <Workspace
        editor={<p>editor content</p>}
        output={<p>output content</p>}
        outputCollapsed={false}
        onToggleOutput={() => {}}
      />,
    );
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
    expect(screen.getByText("output content")).toBeTruthy();
  });

  it("hides the output region from the accessibility tree when collapsed", () => {
    render(
      <Workspace
        editor={<p>editor content</p>}
        output={<p>output content</p>}
        outputCollapsed={true}
        onToggleOutput={() => {}}
      />,
    );
    expect(screen.queryByRole("region", { name: "output" })).toBeNull();
    expect(screen.getByRole("button", { name: "expand output" })).toBeTruthy();
  });

  it("calls onToggleOutput when the toggle is clicked", () => {
    const onToggleOutput = vi.fn();
    render(
      <Workspace
        editor={<p>editor content</p>}
        output={<p>output content</p>}
        outputCollapsed={false}
        onToggleOutput={onToggleOutput}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "collapse output" }));
    expect(onToggleOutput).toHaveBeenCalledOnce();
  });
});

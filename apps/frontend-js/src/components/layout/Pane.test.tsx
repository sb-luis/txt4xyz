import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pane } from "@/components/layout/Pane";

describe("Pane", () => {
  it("renders its title and children", () => {
    render(
      <Pane title="editor">
        <p>hello</p>
      </Pane>,
    );
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
  });
});

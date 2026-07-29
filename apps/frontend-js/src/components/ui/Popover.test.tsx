import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Popover } from "./Popover";

describe("Popover", () => {
  it("opens the panel on trigger click", () => {
    render(
      <Popover trigger="open">
        <p>panel content</p>
      </Popover>,
    );
    expect(screen.queryByText("panel content")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByText("panel content")).toBeTruthy();
  });

  it("closes when clicking outside the panel", () => {
    render(
      <div>
        <Popover trigger="open">
          <p>panel content</p>
        </Popover>
        <button type="button">outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByText("panel content")).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByText("panel content")).toBeNull();
  });

  it("closes on Escape", () => {
    render(
      <Popover trigger="open">
        <p>panel content</p>
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByText("panel content")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("panel content")).toBeNull();
  });

  it("closes when the trigger is clicked again", () => {
    render(
      <Popover trigger="open">
        <p>panel content</p>
      </Popover>,
    );
    const button = screen.getByRole("button", { name: "open" });
    fireEvent.click(button);
    expect(screen.getByText("panel content")).toBeTruthy();

    fireEvent.click(button);
    expect(screen.queryByText("panel content")).toBeNull();
  });
});

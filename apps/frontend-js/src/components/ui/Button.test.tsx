import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a button by default and fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run</Button>);
    const button = screen.getByRole("button", { name: "Run" }) as HTMLButtonElement;
    expect(button.type).toBe("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders an anchor when given an href", () => {
    render(
      <Button href="/edit" target="_blank" rel="noopener noreferrer">
        Open the editor
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Open the editor" }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/edit");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("disables the button and blocks clicks when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Run
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Run" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

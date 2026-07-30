import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Settings">
        <p>content</p>
      </Modal>,
    );
    expect(screen.queryByText("content")).toBeNull();
  });

  it("renders content and a labelled dialog when open", () => {
    render(
      <Modal open onClose={vi.fn()} title="Settings">
        <p>content</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeTruthy();
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("closes on Escape, backdrop click, and the close button", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Settings">
        <p>content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "close settings" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("does not close when clicking inside the panel", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Settings">
        <p>content</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText("content"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

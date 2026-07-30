import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGlobalShortcuts } from "./useGlobalShortcuts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useGlobalShortcuts", () => {
  it("fires onRun on Ctrl/Cmd+Enter and onToggleOutput on Ctrl/Cmd+\\", () => {
    const onRun = vi.fn();
    const onStop = vi.fn();
    const onToggleOutput = vi.fn();
    renderHook(() => useGlobalShortcuts({ onRun, onStop, onToggleOutput }));

    fireEvent.keyDown(document, { key: "Enter", ctrlKey: true });
    expect(onRun).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "\\", metaKey: true });
    expect(onToggleOutput).toHaveBeenCalledTimes(1);

    expect(onStop).not.toHaveBeenCalled();
  });

  it("fires onStop on Escape", () => {
    const onRun = vi.fn();
    const onStop = vi.fn();
    const onToggleOutput = vi.fn();
    renderHook(() => useGlobalShortcuts({ onRun, onStop, onToggleOutput }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("suppresses all shortcuts while a dialog is open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);

    const onRun = vi.fn();
    const onStop = vi.fn();
    const onToggleOutput = vi.fn();
    renderHook(() => useGlobalShortcuts({ onRun, onStop, onToggleOutput }));

    fireEvent.keyDown(document, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(document, { key: "\\", metaKey: true });

    expect(onRun).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
    expect(onToggleOutput).not.toHaveBeenCalled();
  });
});

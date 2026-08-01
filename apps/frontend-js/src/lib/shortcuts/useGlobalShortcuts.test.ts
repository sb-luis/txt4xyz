import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGlobalShortcuts } from "./useGlobalShortcuts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useGlobalShortcuts", () => {
  it("fires onRun on Ctrl/Cmd+Enter and onCycleLayout on Ctrl/Cmd+\\", () => {
    const onRun = vi.fn();
    const onStop = vi.fn();
    const onCycleLayout = vi.fn();
    const onFormat = vi.fn();
    renderHook(() => useGlobalShortcuts({ onRun, onStop, onCycleLayout, onFormat }));

    fireEvent.keyDown(document, { key: "Enter", ctrlKey: true });
    expect(onRun).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "\\", metaKey: true });
    expect(onCycleLayout).toHaveBeenCalledTimes(1);

    expect(onStop).not.toHaveBeenCalled();
  });

  it("fires onFormat on Ctrl/Cmd+Shift+F", () => {
    const onRun = vi.fn();
    const onStop = vi.fn();
    const onCycleLayout = vi.fn();
    const onFormat = vi.fn();
    renderHook(() => useGlobalShortcuts({ onRun, onStop, onCycleLayout, onFormat }));

    fireEvent.keyDown(document, { key: "f", shiftKey: true, ctrlKey: true });
    expect(onFormat).toHaveBeenCalledTimes(1);
  });

  it("fires onStop on Escape", () => {
    const onRun = vi.fn();
    const onStop = vi.fn();
    const onCycleLayout = vi.fn();
    const onFormat = vi.fn();
    renderHook(() => useGlobalShortcuts({ onRun, onStop, onCycleLayout, onFormat }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("suppresses all shortcuts while a dialog is open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);

    const onRun = vi.fn();
    const onStop = vi.fn();
    const onCycleLayout = vi.fn();
    const onFormat = vi.fn();
    renderHook(() => useGlobalShortcuts({ onRun, onStop, onCycleLayout, onFormat }));

    fireEvent.keyDown(document, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(document, { key: "\\", metaKey: true });
    fireEvent.keyDown(document, { key: "f", shiftKey: true, ctrlKey: true });

    expect(onRun).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
    expect(onCycleLayout).not.toHaveBeenCalled();
    expect(onFormat).not.toHaveBeenCalled();
  });

  it("suppresses all shortcuts while a popover is open", () => {
    const popover = document.createElement("div");
    popover.setAttribute("data-slot", "popover-content");
    document.body.appendChild(popover);

    const onRun = vi.fn();
    const onStop = vi.fn();
    const onCycleLayout = vi.fn();
    const onFormat = vi.fn();
    renderHook(() => useGlobalShortcuts({ onRun, onStop, onCycleLayout, onFormat }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onStop).not.toHaveBeenCalled();
  });
});

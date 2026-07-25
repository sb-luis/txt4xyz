import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("disables Run unless the runtime is ready", () => {
    const onRun = vi.fn();
    const { rerender } = render(<AppHeader status="loading" onRun={onRun} onStop={vi.fn()} getCode={() => ""} />);
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="running" onRun={onRun} onStop={vi.fn()} getCode={() => ""} />);
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="error" onRun={onRun} onStop={vi.fn()} getCode={() => ""} />);
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="ready" onRun={onRun} onStop={vi.fn()} getCode={() => ""} />);
    const runButton = screen.getByRole("button", { name: "Run" }) as HTMLButtonElement;
    expect(runButton.disabled).toBe(false);

    fireEvent.click(runButton);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("enables Stop only while running", () => {
    const onStop = vi.fn();
    const { rerender } = render(<AppHeader status="ready" onRun={vi.fn()} onStop={onStop} getCode={() => ""} />);
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="loading" onRun={vi.fn()} onStop={onStop} getCode={() => ""} />);
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="running" onRun={vi.fn()} onStop={onStop} getCode={() => ""} />);
    const stopButton = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
    expect(stopButton.disabled).toBe(false);

    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows a status label reflecting runtime state", () => {
    const { rerender } = render(<AppHeader status="loading" onRun={vi.fn()} onStop={vi.fn()} getCode={() => ""} />);
    expect(screen.getByRole("status").textContent).toMatch(/loading/i);

    rerender(<AppHeader status="error" onRun={vi.fn()} onStop={vi.fn()} getCode={() => ""} />);
    expect(screen.getByRole("status").textContent).toMatch(/error/i);
  });

  it("copies a share link and shows confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<AppHeader status="ready" onRun={vi.fn()} onStop={vi.fn()} getCode={() => "print(1)"} />);
    const shareButton = screen.getByRole("button", { name: "Share" });

    fireEvent.click(shareButton);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: "Copied!" });

    vi.unstubAllGlobals();
  });

  it("shows failure feedback when the clipboard write rejects", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    render(<AppHeader status="ready" onRun={vi.fn()} onStop={vi.fn()} getCode={() => "print(1)"} />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    await screen.findByRole("button", { name: "Copy failed" });

    vi.unstubAllGlobals();
  });
});

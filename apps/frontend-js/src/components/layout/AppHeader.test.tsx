import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("disables Run unless the runtime is ready", () => {
    const onRun = vi.fn();
    const { rerender } = render(<AppHeader status="loading" onRun={onRun} onStop={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="running" onRun={onRun} onStop={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="error" onRun={onRun} onStop={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="ready" onRun={onRun} onStop={vi.fn()} />);
    const runButton = screen.getByRole("button", { name: "Run" }) as HTMLButtonElement;
    expect(runButton.disabled).toBe(false);

    fireEvent.click(runButton);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("enables Stop only while running", () => {
    const onStop = vi.fn();
    const { rerender } = render(<AppHeader status="ready" onRun={vi.fn()} onStop={onStop} />);
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="loading" onRun={vi.fn()} onStop={onStop} />);
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="running" onRun={vi.fn()} onStop={onStop} />);
    const stopButton = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
    expect(stopButton.disabled).toBe(false);

    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows a status label reflecting runtime state", () => {
    const { rerender } = render(<AppHeader status="loading" onRun={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toMatch(/loading/i);

    rerender(<AppHeader status="error" onRun={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toMatch(/error/i);
  });
});

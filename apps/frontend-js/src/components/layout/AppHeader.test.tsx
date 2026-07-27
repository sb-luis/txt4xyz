import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

const DISCONNECTED_ROOM = { status: "disconnected" as const, participants: [] };

describe("AppHeader", () => {
  it("disables Run unless the runtime is ready", () => {
    const onRun = vi.fn();
    const { rerender } = render(
      <AppHeader status="loading" onRun={onRun} onStop={vi.fn()} room={DISCONNECTED_ROOM} />,
    );
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="running" onRun={onRun} onStop={vi.fn()} room={DISCONNECTED_ROOM} />);
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="error" onRun={onRun} onStop={vi.fn()} room={DISCONNECTED_ROOM} />);
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="ready" onRun={onRun} onStop={vi.fn()} room={DISCONNECTED_ROOM} />);
    const runButton = screen.getByRole("button", { name: "Run" }) as HTMLButtonElement;
    expect(runButton.disabled).toBe(false);

    fireEvent.click(runButton);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("enables Stop only while running", () => {
    const onStop = vi.fn();
    const { rerender } = render(
      <AppHeader status="ready" onRun={vi.fn()} onStop={onStop} room={DISCONNECTED_ROOM} />,
    );
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="loading" onRun={vi.fn()} onStop={onStop} room={DISCONNECTED_ROOM} />);
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<AppHeader status="running" onRun={vi.fn()} onStop={onStop} room={DISCONNECTED_ROOM} />);
    const stopButton = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
    expect(stopButton.disabled).toBe(false);

    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows a runtime status label reflecting runtime state", () => {
    const { rerender } = render(
      <AppHeader status="loading" onRun={vi.fn()} onStop={vi.fn()} room={DISCONNECTED_ROOM} />,
    );
    expect(screen.getByRole("status", { name: "runtime status" }).textContent).toMatch(/loading/i);

    rerender(<AppHeader status="error" onRun={vi.fn()} onStop={vi.fn()} room={DISCONNECTED_ROOM} />);
    expect(screen.getByRole("status", { name: "runtime status" }).textContent).toMatch(/error/i);
  });

  it("shows a room status label reflecting the connection state", () => {
    const { rerender } = render(
      <AppHeader status="ready" onRun={vi.fn()} onStop={vi.fn()} room={{ status: "connecting", participants: [] }} />,
    );
    expect(screen.getByRole("status", { name: "room status" }).textContent).toMatch(/connecting/i);

    rerender(
      <AppHeader status="ready" onRun={vi.fn()} onStop={vi.fn()} room={{ status: "connected", participants: [] }} />,
    );
    expect(screen.getByRole("status", { name: "room status" }).textContent).toMatch(/^connected$/i);
  });

  it("lists participants only once someone besides the local user is present", () => {
    const { rerender } = render(
      <AppHeader status="ready" onRun={vi.fn()} onStop={vi.fn()} room={DISCONNECTED_ROOM} />,
    );
    expect(screen.queryByRole("list", { name: "participants" })).toBeNull();

    rerender(
      <AppHeader
        status="ready"
        onRun={vi.fn()}
        onStop={vi.fn()}
        room={{ status: "connected", participants: [{ clientId: 1, name: "ava", color: "oklch(0.8 0.1 200)" }] }}
      />,
    );
    expect(screen.getByRole("list", { name: "participants" })).toBeTruthy();
    expect(screen.getByTitle("ava")).toBeTruthy();
  });
});

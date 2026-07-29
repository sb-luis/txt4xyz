import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { AppHeader } from "./AppHeader";

const DISCONNECTED_ROOM = { status: "disconnected" as const, rejectedCode: null, participants: [] };

function withTheme(element: ReactElement) {
  return <ThemeProvider>{element}</ThemeProvider>;
}

describe("AppHeader", () => {
  it("merges Run/Stop into a single toggle reflecting runner status", () => {
    const onRun = vi.fn();
    const onStop = vi.fn();
    const { rerender } = render(
      withTheme(<AppHeader status="loading" onRun={onRun} onStop={onStop} room={DISCONNECTED_ROOM} />),
    );
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

    rerender(
      withTheme(<AppHeader status="error" onRun={onRun} onStop={onStop} room={DISCONNECTED_ROOM} />),
    );
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

    rerender(
      withTheme(<AppHeader status="ready" onRun={onRun} onStop={onStop} room={DISCONNECTED_ROOM} />),
    );
    const runButton = screen.getByRole("button", { name: "Run" }) as HTMLButtonElement;
    expect(runButton.disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

    fireEvent.click(runButton);
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();

    rerender(
      withTheme(<AppHeader status="running" onRun={onRun} onStop={onStop} room={DISCONNECTED_ROOM} />),
    );
    const stopButton = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
    expect(stopButton.disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Run" })).toBeNull();

    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("renders the participants list, delegating room status to it", () => {
    render(
      withTheme(
        <AppHeader
          status="ready"
          onRun={vi.fn()}
          onStop={vi.fn()}
          room={{ status: "connected", rejectedCode: null, participants: [] }}
        />,
      ),
    );
    expect(screen.getByRole("button", { name: /^room:/ })).toBeTruthy();
  });
});

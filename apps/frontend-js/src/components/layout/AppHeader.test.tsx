import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { AliasProvider } from "@/lib/alias/AliasContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { VimModeProvider } from "@/lib/vim/VimModeContext";
import { AppHeader } from "./AppHeader";

const DISCONNECTED_ROOM = { status: "disconnected" as const, rejectedCode: null, participants: [] };

function withTheme(element: ReactElement) {
  return (
    <ThemeProvider>
      <VimModeProvider>
        <AliasProvider>{element}</AliasProvider>
      </VimModeProvider>
    </ThemeProvider>
  );
}

describe("AppHeader", () => {
  it("merges Run/Stop into a single toggle reflecting runner status", () => {
    const onRun = vi.fn();
    const onStop = vi.fn();
    const { rerender } = render(
      withTheme(<AppHeader status="loading" onRun={onRun} onStop={onStop} onFormat={vi.fn()} formatterStatus="ready" room={DISCONNECTED_ROOM} workspaceLayout="split" onWorkspaceLayoutChange={vi.fn()} />),
    );
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

    rerender(
      withTheme(<AppHeader status="error" onRun={onRun} onStop={onStop} onFormat={vi.fn()} formatterStatus="ready" room={DISCONNECTED_ROOM} workspaceLayout="split" onWorkspaceLayoutChange={vi.fn()} />),
    );
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

    rerender(
      withTheme(<AppHeader status="ready" onRun={onRun} onStop={onStop} onFormat={vi.fn()} formatterStatus="ready" room={DISCONNECTED_ROOM} workspaceLayout="split" onWorkspaceLayoutChange={vi.fn()} />),
    );
    const runButton = screen.getByRole("button", { name: "Run" }) as HTMLButtonElement;
    expect(runButton.disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

    fireEvent.click(runButton);
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();

    rerender(
      withTheme(<AppHeader status="running" onRun={onRun} onStop={onStop} onFormat={vi.fn()} formatterStatus="ready" room={DISCONNECTED_ROOM} workspaceLayout="split" onWorkspaceLayoutChange={vi.fn()} />),
    );
    const stopButton = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
    expect(stopButton.disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Run" })).toBeNull();

    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("calls onFormat when the format button is clicked", () => {
    const onFormat = vi.fn();
    render(
      withTheme(
        <AppHeader
          status="ready"
          onRun={vi.fn()}
          onStop={vi.fn()}
          onFormat={onFormat}
          formatterStatus="ready"
          room={DISCONNECTED_ROOM}
          workspaceLayout="split"
          onWorkspaceLayoutChange={vi.fn()}
        />,
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "format code" }));
    expect(onFormat).toHaveBeenCalledTimes(1);
  });

  it("disables the format button until the formatter is ready", () => {
    const { rerender } = render(
      withTheme(
        <AppHeader
          status="ready"
          onRun={vi.fn()}
          onStop={vi.fn()}
          onFormat={vi.fn()}
          formatterStatus="loading"
          room={DISCONNECTED_ROOM}
          workspaceLayout="split"
          onWorkspaceLayoutChange={vi.fn()}
        />,
      ),
    );
    expect((screen.getByRole("button", { name: "format code" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(
      withTheme(
        <AppHeader
          status="ready"
          onRun={vi.fn()}
          onStop={vi.fn()}
          onFormat={vi.fn()}
          formatterStatus="ready"
          room={DISCONNECTED_ROOM}
          workspaceLayout="split"
          onWorkspaceLayoutChange={vi.fn()}
        />,
      ),
    );
    expect((screen.getByRole("button", { name: "format code" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("renders the participants list, delegating room status to it", () => {
    render(
      withTheme(
        <AppHeader
          status="ready"
          onRun={vi.fn()}
          onStop={vi.fn()}
          onFormat={vi.fn()}
          formatterStatus="ready"
          room={{ status: "connected", rejectedCode: null, participants: [] }}
          workspaceLayout="split"
          onWorkspaceLayoutChange={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole("button", { name: /^room:/ })).toBeTruthy();
  });

  it("calls onWorkspaceLayoutChange when a layout option is selected", () => {
    const onWorkspaceLayoutChange = vi.fn();
    render(
      withTheme(
        <AppHeader
          status="ready"
          onRun={vi.fn()}
          onStop={vi.fn()}
          onFormat={vi.fn()}
          formatterStatus="ready"
          room={DISCONNECTED_ROOM}
          workspaceLayout="split"
          onWorkspaceLayoutChange={onWorkspaceLayoutChange}
        />,
      ),
    );

    fireEvent.click(screen.getByRole("radio", { name: "output only" }));
    expect(onWorkspaceLayoutChange).toHaveBeenCalledWith("output");
  });

  it("opens the settings modal, which shows shortcuts and a theme switcher", () => {
    render(
      withTheme(
        <AppHeader status="ready" onRun={vi.fn()} onStop={vi.fn()} onFormat={vi.fn()} formatterStatus="ready" room={DISCONNECTED_ROOM} workspaceLayout="split" onWorkspaceLayoutChange={vi.fn()} />,
      ),
    );

    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "open settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeTruthy();
    expect(screen.getByText("Run code")).toBeTruthy();
    expect(screen.getByRole("button", { name: /switch to (dark|light) mode/ })).toBeTruthy();
  });
});

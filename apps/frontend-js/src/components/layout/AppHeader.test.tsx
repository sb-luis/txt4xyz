import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { AliasProvider } from "@/components/settings/AliasContext";
import { ThemeProvider } from "@/components/settings/ThemeContext";
import { VimModeProvider } from "@/components/settings/VimModeContext";
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
  it("calls onFormat when the format button is clicked", () => {
    const onFormat = vi.fn();
    render(
      withTheme(
        <AppHeader
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
        <AppHeader
          onFormat={vi.fn()}
          formatterStatus="ready"
          room={DISCONNECTED_ROOM}
          workspaceLayout="split"
          onWorkspaceLayoutChange={vi.fn()}
        />,
      ),
    );

    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "open settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeTruthy();
    expect(screen.getByText("Run code")).toBeTruthy();
    expect(screen.getByRole("button", { name: /switch to (dark|light) mode/ })).toBeTruthy();
  });
});

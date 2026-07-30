import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AliasProvider } from "@/lib/alias/AliasContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { VimModeProvider } from "@/lib/vim/VimModeContext";
import { SettingsModal } from "./SettingsModal";

describe("SettingsModal", () => {
  it("lists shortcuts and includes a working theme switcher", () => {
    render(
      <ThemeProvider>
        <VimModeProvider>
          <AliasProvider>
            <SettingsModal open onClose={vi.fn()} />
          </AliasProvider>
        </VimModeProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText("Run code")).toBeTruthy();
    expect(screen.getByText("Stop execution")).toBeTruthy();
    expect(screen.getByText("Collapse/expand output")).toBeTruthy();

    const before = document.documentElement.getAttribute("data-theme");
    fireEvent.click(screen.getByRole("button", { name: /switch to (dark|light) mode/ }));
    expect(document.documentElement.getAttribute("data-theme")).not.toBe(before);
  });

  it("toggles vim keybindings on and persists the choice", () => {
    window.localStorage.removeItem("txt4xyz:vim-mode");
    render(
      <ThemeProvider>
        <VimModeProvider>
          <AliasProvider>
            <SettingsModal open onClose={vi.fn()} />
          </AliasProvider>
        </VimModeProvider>
      </ThemeProvider>,
    );

    const toggle = screen.getByRole("switch", { name: "toggle vim keybindings" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem("txt4xyz:vim-mode")).toBe("true");
  });
});

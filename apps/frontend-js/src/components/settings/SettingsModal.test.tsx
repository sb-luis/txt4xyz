import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { SettingsModal } from "./SettingsModal";

describe("SettingsModal", () => {
  it("lists shortcuts and includes a working theme switcher", () => {
    render(
      <ThemeProvider>
        <SettingsModal open onClose={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByText("Run code")).toBeTruthy();
    expect(screen.getByText("Stop execution")).toBeTruthy();
    expect(screen.getByText("Collapse/expand output")).toBeTruthy();

    const before = document.documentElement.getAttribute("data-theme");
    fireEvent.click(screen.getByRole("button", { name: /switch to (dark|light) mode/ }));
    expect(document.documentElement.getAttribute("data-theme")).not.toBe(before);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "@/components/settings/ThemeContext";
import { ThemeSwitcher } from "./ThemeSwitcher";

describe("ThemeSwitcher", () => {
  it("toggles the document theme attribute and its own label on click", () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    const before = document.documentElement.getAttribute("data-theme");
    const button = screen.getByRole("button");
    fireEvent.click(button);
    const after = document.documentElement.getAttribute("data-theme");

    expect(after).not.toBe(before);
    expect(["light", "dark"]).toContain(after);
  });
});

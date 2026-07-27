import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Homepage } from "./Homepage";

describe("Homepage", () => {
  it("links its CTA to the editor and opens it in a new tab", () => {
    render(<Homepage />);
    const link = screen.getByRole("link", { name: /open the editor/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/edit");
    expect(link.target).toBe("_blank");
  });
});

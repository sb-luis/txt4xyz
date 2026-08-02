import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Homepage } from "./Homepage";

describe("Homepage", () => {
  it("links the collab CTA to the editor and opens it in a new tab", () => {
    render(<Homepage />);
    const link = screen.getByRole("link", { name: /collab/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/edit");
    expect(link.target).toBe("_blank");
  });

  it("links the offline CTA to the offline route and opens it in a new tab", () => {
    render(<Homepage />);
    const link = screen.getByRole("link", { name: /offline/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/offline");
    expect(link.target).toBe("_blank");
  });
});

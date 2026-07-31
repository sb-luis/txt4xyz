import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlotView } from "./PlotView";

describe("PlotView", () => {
  it("renders an img element, never raw SVG markup in the DOM", () => {
    const svg = "<svg><script>alert('xss')</script></svg>";
    const { container } = render(<PlotView svg={svg} />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);

    // Regression guard: the SVG must never be injected as live markup, since
    // it is attacker-controlled content broadcast to every peer's browser.
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("dangerouslySetInnerHTML");
  });
});

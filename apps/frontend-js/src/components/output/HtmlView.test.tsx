import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HtmlView } from "./HtmlView";

describe("HtmlView", () => {
  it("renders an iframe sandboxed against scripts and same-origin access", () => {
    const html = "<h1>hi</h1><script>window.parent.postMessage('x')</script>";
    const { container } = render(<HtmlView html={html} />);

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("srcdoc")).toBe(html);

    // Regression guard: broadcast HTML is attacker-controlled content — the
    // sandbox must carry neither allow-scripts nor allow-same-origin.
    const sandbox = iframe?.getAttribute("sandbox") ?? "";
    expect(sandbox).not.toContain("allow-scripts");
    expect(sandbox).not.toContain("allow-same-origin");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OutputPane } from "./OutputPane";
import type { OutputEntry } from "@/lib/python/runner";

describe("OutputPane", () => {
  it("shows a loading state while the runtime loads", () => {
    render(<OutputPane status="loading" output={[]} />);
    expect(screen.getByText(/loading python runtime/i)).toBeTruthy();
  });

  it("shows an error state when the runtime fails", () => {
    render(<OutputPane status="error" output={[]} />);
    expect(screen.getByText(/failed to load/i)).toBeTruthy();
  });

  it("shows an empty state when ready with no output", () => {
    render(<OutputPane status="ready" output={[]} />);
    expect(screen.getByText(/run your code/i)).toBeTruthy();
  });

  it("renders stdout, stderr, and traceback entries distinctly", () => {
    const output: OutputEntry[] = [
      { kind: "stdout", line: "hello" },
      { kind: "stderr", line: "warn" },
      { kind: "traceback", text: "ZeroDivisionError" },
    ];
    render(<OutputPane status="ready" output={output} />);

    const stdoutLine = screen.getByText("hello");
    const stderrLine = screen.getByText("warn");
    const tracebackLine = screen.getByText("ZeroDivisionError");

    expect(stdoutLine.className).toContain("text-app-fg");
    expect(stderrLine.className).toContain("text-app-error");
    expect(tracebackLine.className).toContain("text-app-error");
  });

  it("renders output while running", () => {
    render(<OutputPane status="running" output={[{ kind: "stdout", line: "1" }]} />);
    expect(screen.getByText("1")).toBeTruthy();
  });
});

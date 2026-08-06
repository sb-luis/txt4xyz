import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OutputPane } from "./OutputPane";
import type { OutputEntry } from "@txt4/lang-py";

const fetchDataframePage = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

describe("OutputPane", () => {
  it("shows a loading state while the runtime loads", () => {
    render(<OutputPane status="loading" output={[]} fetchDataframePage={fetchDataframePage} />);
    expect(screen.getByText(/loading python runtime/i)).toBeTruthy();
  });

  it("shows an error state when the runtime fails", () => {
    render(<OutputPane status="error" output={[]} fetchDataframePage={fetchDataframePage} />);
    expect(screen.getByText(/failed to load/i)).toBeTruthy();
  });

  it("shows an empty state when ready with no output", () => {
    render(<OutputPane status="ready" output={[]} fetchDataframePage={fetchDataframePage} />);
    expect(screen.getByText(/run your code/i)).toBeTruthy();
  });

  it("renders stdout, stderr, and traceback entries distinctly", () => {
    const output: OutputEntry[] = [
      { kind: "stdout", line: "hello" },
      { kind: "stderr", line: "warn" },
      { kind: "traceback", text: "ZeroDivisionError" },
    ];
    render(<OutputPane status="ready" output={output} fetchDataframePage={fetchDataframePage} />);

    const stdoutLine = screen.getByText("hello");
    const stderrLine = screen.getByText("warn");
    const tracebackLine = screen.getByText("ZeroDivisionError");

    expect(stdoutLine.className).toContain("text-foreground");
    expect(stderrLine.className).toContain("text-destructive");
    expect(tracebackLine.className).toContain("text-destructive");
  });

  it("renders output while running", () => {
    render(
      <OutputPane
        status="running"
        output={[{ kind: "stdout", line: "1" }]}
        fetchDataframePage={fetchDataframePage}
      />,
    );
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("binds a dataframe entry's fetchPage to its handle", () => {
    const output: OutputEntry[] = [
      {
        kind: "dataframe",
        handle: "h1",
        columns: ["a"],
        rows: [["1"]],
        rowCount: 1,
        truncated: false,
      },
    ];
    render(<OutputPane status="ready" output={output} fetchDataframePage={fetchDataframePage} />);
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });
});

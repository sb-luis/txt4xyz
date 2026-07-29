import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  it("shows a runtime status label reflecting runtime state", () => {
    const { rerender } = render(<StatusBar runtimeStatus="loading" docLength={0} maxDocLength={100_000} />);
    expect(screen.getByText(/loading runtime/i)).toBeTruthy();

    rerender(<StatusBar runtimeStatus="error" docLength={0} maxDocLength={100_000} />);
    expect(screen.getByText(/runtime error/i)).toBeTruthy();
  });

  it("shows the current document length against the max", () => {
    render(<StatusBar runtimeStatus="ready" docLength={42} maxDocLength={100_000} />);
    expect(screen.getByText("42 / 100K chars")).toBeTruthy();
  });

  it("abbreviates large counts in thousands", () => {
    render(<StatusBar runtimeStatus="ready" docLength={95_000} maxDocLength={100_000} />);
    expect(screen.getByText("95K / 100K chars")).toBeTruthy();
  });
});

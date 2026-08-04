import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  it("shows a runtime status label reflecting runtime state", () => {
    const { rerender } = render(
      <StatusBar runtimeStatus="loading" formatterStatus="ready" docBytes={0} stepNumber={null} />,
    );
    expect(screen.getByText(/loading runtime/i)).toBeTruthy();

    rerender(<StatusBar runtimeStatus="error" formatterStatus="ready" docBytes={0} stepNumber={null} />);
    expect(screen.getByText(/runtime error/i)).toBeTruthy();
  });

  it("shows a formatter status label reflecting formatter state", () => {
    const { rerender } = render(
      <StatusBar runtimeStatus="ready" formatterStatus="loading" docBytes={0} stepNumber={null} />,
    );
    expect(screen.getByText(/loading formatter/i)).toBeTruthy();

    rerender(<StatusBar runtimeStatus="ready" formatterStatus="error" docBytes={0} stepNumber={null} />);
    expect(screen.getByText(/formatter error/i)).toBeTruthy();

    rerender(<StatusBar runtimeStatus="ready" formatterStatus="ready" docBytes={0} stepNumber={null} />);
    expect(screen.getByText(/formatter ready/i)).toBeTruthy();
  });

  it("shows the current document size in bytes, with no cap shown", () => {
    render(<StatusBar runtimeStatus="ready" formatterStatus="ready" docBytes={42} stepNumber={null} />);
    expect(screen.getByText("42 B")).toBeTruthy();
  });

  it("switches to KB above 1024 bytes", () => {
    render(<StatusBar runtimeStatus="ready" formatterStatus="ready" docBytes={1536} stepNumber={null} />);
    expect(screen.getByText("1.5 KB")).toBeTruthy();
  });

  it("hides the step counter when there is no active step", () => {
    render(<StatusBar runtimeStatus="ready" formatterStatus="ready" docBytes={0} stepNumber={null} />);
    expect(screen.queryByText(/^Step /)).toBeNull();
  });

  it("shows the current step number, with no total shown", () => {
    render(<StatusBar runtimeStatus="ready" formatterStatus="ready" docBytes={0} stepNumber={4} />);
    expect(screen.getByText("Step 4")).toBeTruthy();
  });
});

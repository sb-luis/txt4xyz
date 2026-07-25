import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodeEditor } from "./CodeEditor";

describe("CodeEditor", () => {
  it("mounts without crashing and renders its container", () => {
    const { getByLabelText } = render(<CodeEditor initialDoc="print(1)" onChange={vi.fn()} />);
    expect(getByLabelText("code editor")).toBeTruthy();
  });

  it("unmounts cleanly", () => {
    const { unmount } = render(<CodeEditor initialDoc="print(1)" onChange={vi.fn()} />);
    expect(() => unmount()).not.toThrow();
  });
});

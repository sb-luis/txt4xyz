import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { EditorView } from "@codemirror/view";
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

  it("shows a remote Y.Text edit and reflects local edits back into the Y.Text", () => {
    const doc = new Y.Doc();
    const ytext = doc.getText("shared");
    const { container } = render(<CodeEditor initialDoc="" onChange={vi.fn()} ytext={ytext} />);

    doc.transact(() => {
      ytext.insert(0, "hello from peer");
    });
    expect(container.textContent).toContain("hello from peer");

    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl);
    view!.dispatch({ changes: { from: 0, insert: "local " } });

    expect(ytext.toString()).toBe("local hello from peer");
  });

  it("shows text the Y.Text already held before the editor mounted", () => {
    const doc = new Y.Doc();
    const ytext = doc.getText("shared");
    ytext.insert(0, "print('already here')");

    const { container } = render(<CodeEditor initialDoc="" onChange={vi.fn()} ytext={ytext} />);

    expect(container.textContent).toContain("print('already here')");
  });

  it("rejects a local edit that would push the document past the character cap", () => {
    const { container } = render(<CodeEditor initialDoc={"x".repeat(99_995)} onChange={vi.fn()} />);

    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;

    view.dispatch({ changes: { from: view.state.doc.length, insert: "abcde" }, userEvent: "input.type" });
    expect(view.state.doc.length).toBe(100_000);

    view.dispatch({ changes: { from: view.state.doc.length, insert: "f" }, userEvent: "input.type" });
    expect(view.state.doc.length).toBe(100_000);
  });

  it("rejects a paste that alone would exceed the cap rather than truncating it", () => {
    const { container } = render(<CodeEditor initialDoc="" onChange={vi.fn()} />);

    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;

    view.dispatch({ changes: { from: 0, insert: "y".repeat(100_001) }, userEvent: "input.paste" });

    expect(view.state.doc.length).toBe(0);
  });

  it("never rejects a remote Y.Text update even when it pushes the document past the character cap", () => {
    const doc = new Y.Doc();
    const ytext = doc.getText("shared");
    ytext.insert(0, "x".repeat(99_995));

    const { container } = render(<CodeEditor initialDoc="" onChange={vi.fn()} ytext={ytext} />);

    doc.transact(() => {
      ytext.insert(ytext.length, "y".repeat(50));
    });

    expect(ytext.length).toBe(100_045);
    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;
    expect(view.state.doc.length).toBe(100_045);
  });
});

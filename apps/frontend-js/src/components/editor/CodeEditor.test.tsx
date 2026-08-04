import { createRef } from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { EditorView } from "@codemirror/view";
import { VimModeProvider } from "@/lib/vim/VimModeContext";
import { CodeEditor, type CodeEditorHandle, type CodeEditorProps } from "./CodeEditor";

function renderCodeEditor(props: CodeEditorProps) {
  return render(
    <VimModeProvider>
      <CodeEditor {...props} />
    </VimModeProvider>,
  );
}

describe("CodeEditor", () => {
  it("mounts without crashing and renders its container", () => {
    const { getByLabelText } = renderCodeEditor({ initialDoc: "print(1)", onChange: vi.fn() });
    expect(getByLabelText("code editor")).toBeTruthy();
  });

  it("unmounts cleanly", () => {
    const { unmount } = renderCodeEditor({ initialDoc: "print(1)", onChange: vi.fn() });
    expect(() => unmount()).not.toThrow();
  });

  it("shows a remote Y.Text edit and reflects local edits back into the Y.Text", () => {
    const doc = new Y.Doc();
    const ytext = doc.getText("shared");
    const { container } = renderCodeEditor({ initialDoc: "", onChange: vi.fn(), ytext });

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

    const { container } = renderCodeEditor({ initialDoc: "", onChange: vi.fn(), ytext });

    expect(container.textContent).toContain("print('already here')");
  });

  it("rejects a local edit that would push the document past the character cap", () => {
    const { container } = renderCodeEditor({ initialDoc: "x".repeat(99_995), onChange: vi.fn() });

    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;

    view.dispatch({ changes: { from: view.state.doc.length, insert: "abcde" }, userEvent: "input.type" });
    expect(view.state.doc.length).toBe(100_000);

    view.dispatch({ changes: { from: view.state.doc.length, insert: "f" }, userEvent: "input.type" });
    expect(view.state.doc.length).toBe(100_000);
  });

  it("rejects a paste that alone would exceed the cap rather than truncating it", () => {
    const { container } = renderCodeEditor({ initialDoc: "", onChange: vi.fn() });

    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;

    view.dispatch({ changes: { from: 0, insert: "y".repeat(100_001) }, userEvent: "input.paste" });

    expect(view.state.doc.length).toBe(0);
  });

  it("does not insert a newline on Mod-Enter, leaving it for the global Run shortcut", () => {
    const { container } = renderCodeEditor({ initialDoc: "print(1)", onChange: vi.fn() });

    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;
    view.dispatch({ selection: { anchor: view.state.doc.length } });

    fireEvent.keyDown(contentEl, { key: "Enter", ctrlKey: true });

    expect(view.state.doc.toString()).toBe("print(1)");
  });

  it("applies the run-flash decoration to every line when flashKey changes", () => {
    const { container, rerender } = render(
      <VimModeProvider>
        <CodeEditor initialDoc={"a\nb\nc"} onChange={vi.fn()} flashKey={0} />
      </VimModeProvider>,
    );

    expect(container.querySelectorAll(".cm-run-flash")).toHaveLength(0);

    rerender(
      <VimModeProvider>
        <CodeEditor initialDoc={"a\nb\nc"} onChange={vi.fn()} flashKey={1} />
      </VimModeProvider>,
    );

    expect(container.querySelectorAll(".cm-run-flash")).toHaveLength(3);
  });

  it("decorates exactly the given line as current, moving and clearing as the prop changes", () => {
    const { container, rerender } = render(
      <VimModeProvider>
        <CodeEditor initialDoc={"a\nb\nc"} onChange={vi.fn()} currentLine={null} />
      </VimModeProvider>,
    );

    expect(container.querySelectorAll(".cm-current-line")).toHaveLength(0);

    rerender(
      <VimModeProvider>
        <CodeEditor initialDoc={"a\nb\nc"} onChange={vi.fn()} currentLine={2} />
      </VimModeProvider>,
    );

    const decorated = container.querySelectorAll(".cm-current-line");
    expect(decorated).toHaveLength(1);
    expect(decorated[0].textContent).toBe("b");

    rerender(
      <VimModeProvider>
        <CodeEditor initialDoc={"a\nb\nc"} onChange={vi.fn()} currentLine={null} />
      </VimModeProvider>,
    );

    expect(container.querySelectorAll(".cm-current-line")).toHaveLength(0);
  });

  it("does not flash on initial mount even when flashKey is already set", () => {
    const { container } = renderCodeEditor({
      initialDoc: "a\nb",
      onChange: vi.fn(),
      flashKey: 5,
    });

    expect(container.querySelectorAll(".cm-run-flash")).toHaveLength(0);
  });

  it("never rejects a remote Y.Text update even when it pushes the document past the character cap", () => {
    const doc = new Y.Doc();
    const ytext = doc.getText("shared");
    ytext.insert(0, "x".repeat(99_995));

    const { container } = renderCodeEditor({ initialDoc: "", onChange: vi.fn(), ytext });

    doc.transact(() => {
      ytext.insert(ytext.length, "y".repeat(50));
    });

    expect(ytext.length).toBe(100_045);
    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;
    expect(view.state.doc.length).toBe(100_045);
  });

  it("replaces the whole document via the imperative handle, syncing back into Y.Text", () => {
    const doc = new Y.Doc();
    const ytext = doc.getText("shared");
    ytext.insert(0, "x=1");
    const ref = createRef<CodeEditorHandle>();

    render(
      <VimModeProvider>
        <CodeEditor ref={ref} initialDoc="" onChange={vi.fn()} ytext={ytext} />
      </VimModeProvider>,
    );

    ref.current!.replaceContent("x = 1\n");

    expect(ytext.toString()).toBe("x = 1\n");
  });
});

import { createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { EditorView } from "@codemirror/view";
import { VimModeProvider } from "@/components/settings/VimModeContext";
import { CodeEditor, type CodeEditorHandle, type CodeEditorProps } from "./CodeEditor";

// @txt4/core's own Txt4Editor suite already covers mount/unmount, onChange,
// flash/currentLine decorations, the doc length cap, Mod-Enter, and
// replaceContent in isolation. What's left here is specific to this app's
// composition: wiring a Y.Text in as a yCollab extension.

function renderCodeEditor(props: CodeEditorProps) {
  return render(
    <VimModeProvider>
      <CodeEditor {...props} />
    </VimModeProvider>,
  );
}

describe("CodeEditor", () => {
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

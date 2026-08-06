import { createRef } from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { undoDepth } from "@codemirror/commands";
import { EditorView, keymap } from "@codemirror/view";
import { Txt4Editor, type Txt4EditorHandle } from "./Txt4Editor";

describe("Txt4Editor", () => {
  it("mounts without crashing and renders its container", () => {
    const { getByLabelText } = render(<Txt4Editor initialDoc="hello" onChange={vi.fn()} />);
    expect(getByLabelText("code editor")).toBeTruthy();
  });

  it("unmounts cleanly", () => {
    const { unmount } = render(<Txt4Editor initialDoc="hello" onChange={vi.fn()} />);
    expect(() => unmount()).not.toThrow();
  });

  it("reports local edits via onChange", () => {
    const onChange = vi.fn();
    const { container } = render(<Txt4Editor initialDoc="a" onChange={onChange} />);
    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;

    view.dispatch({ changes: { from: 1, insert: "b" } });

    expect(onChange).toHaveBeenCalledWith("ab");
  });

  it("applies the run-flash class to every line when flashKey changes, but not on initial mount", () => {
    const { container, rerender } = render(
      <Txt4Editor initialDoc={"a\nb\nc"} onChange={vi.fn()} flashKey={5} />,
    );
    expect(container.querySelectorAll(".txt4-run-flash")).toHaveLength(0);

    rerender(<Txt4Editor initialDoc={"a\nb\nc"} onChange={vi.fn()} flashKey={6} />);
    expect(container.querySelectorAll(".txt4-run-flash")).toHaveLength(3);
  });

  it("decorates exactly the given line as current, moving and clearing as the prop changes", () => {
    const { container, rerender } = render(
      <Txt4Editor initialDoc={"a\nb\nc"} onChange={vi.fn()} currentLine={null} />,
    );
    expect(container.querySelectorAll(".txt4-current-line")).toHaveLength(0);

    rerender(<Txt4Editor initialDoc={"a\nb\nc"} onChange={vi.fn()} currentLine={2} />);
    const decorated = container.querySelectorAll(".txt4-current-line");
    expect(decorated).toHaveLength(1);
    expect(decorated[0].textContent).toBe("b");

    rerender(<Txt4Editor initialDoc={"a\nb\nc"} onChange={vi.fn()} currentLine={null} />);
    expect(container.querySelectorAll(".txt4-current-line")).toHaveLength(0);
  });

  it("applies a custom colors.runColor as the current-line's background", () => {
    const { container } = render(
      <Txt4Editor initialDoc={"a\nb"} onChange={vi.fn()} currentLine={1} colors={{ runColor: "rgb(1, 2, 3)" }} />,
    );
    const decorated = container.querySelector(".txt4-current-line") as HTMLElement;
    expect(getComputedStyle(decorated).backgroundColor).toBe("rgb(1, 2, 3)");
  });

  it("rejects a local edit that would push the document past maxDocLength", () => {
    const { container } = render(
      <Txt4Editor initialDoc={"x".repeat(8)} onChange={vi.fn()} maxDocLength={10} />,
    );
    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;

    view.dispatch({ changes: { from: view.state.doc.length, insert: "abc" }, userEvent: "input.type" });
    expect(view.state.doc.length).toBe(8);

    view.dispatch({ changes: { from: view.state.doc.length, insert: "ab" }, userEvent: "input.type" });
    expect(view.state.doc.length).toBe(10);
  });

  it("does not insert a newline on Mod-Enter, leaving it for a host's own run shortcut", () => {
    const { container } = render(<Txt4Editor initialDoc="a" onChange={vi.fn()} />);
    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;
    view.dispatch({ selection: { anchor: view.state.doc.length } });

    fireEvent.keyDown(contentEl, { key: "Enter", ctrlKey: true });

    expect(view.state.doc.toString()).toBe("a");
  });

  it("replaces the whole document via the imperative handle", () => {
    const ref = createRef<Txt4EditorHandle>();
    render(<Txt4Editor ref={ref} initialDoc="x=1" onChange={vi.fn()} />);

    ref.current!.replaceContent("x = 1\n");

    const view = EditorView.findFromDOM(document.querySelector(".cm-content") as HTMLElement)!;
    expect(view.state.doc.toString()).toBe("x = 1\n");
  });

  it("gives a 'before'-positioned extension precedence over its own default keymap", () => {
    const calls: string[] = [];
    const hostKeymap = keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          calls.push("host");
          return true;
        },
      },
    ]);

    const { container } = render(
      <Txt4Editor
        initialDoc="a"
        onChange={vi.fn()}
        extensions={[{ extension: hostKeymap, position: "before" }]}
      />,
    );
    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    fireEvent.keyDown(contentEl, { key: "Enter", ctrlKey: true });

    expect(calls).toEqual(["host"]);
  });

  it("applies a bare, default-positioned extension without breaking the editor", () => {
    const { getByLabelText } = render(
      <Txt4Editor initialDoc="a" onChange={vi.fn()} extensions={[EditorView.editable.of(false)]} />,
    );
    expect(getByLabelText("code editor")).toBeTruthy();
  });

  it("preserves document content and undo history when the extensions prop changes", () => {
    const { container, rerender } = render(
      <Txt4Editor initialDoc="hello" onChange={vi.fn()} extensions={[]} />,
    );
    const contentEl = container.querySelector(".cm-content") as HTMLElement;
    const view = EditorView.findFromDOM(contentEl)!;

    view.dispatch({ changes: { from: 5, insert: " world" }, userEvent: "input.type" });
    expect(view.state.doc.toString()).toBe("hello world");

    rerender(
      <Txt4Editor
        initialDoc="hello"
        onChange={vi.fn()}
        extensions={[{ extension: EditorView.editable.of(false), position: "before" }]}
      />,
    );

    expect(view.state.doc.toString()).toBe("hello world");
    expect(undoDepth(view.state)).toBeGreaterThan(0);
  });

  it("keeps a reconfigured 'before' extension ahead of the default keymap", () => {
    const calls: string[] = [];
    const hostKeymap = keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          calls.push("host");
          return true;
        },
      },
    ]);

    const { container, rerender } = render(<Txt4Editor initialDoc="a" onChange={vi.fn()} extensions={[]} />);
    const contentEl = container.querySelector(".cm-content") as HTMLElement;

    rerender(
      <Txt4Editor
        initialDoc="a"
        onChange={vi.fn()}
        extensions={[{ extension: hostKeymap, position: "before" }]}
      />,
    );

    fireEvent.keyDown(contentEl, { key: "Enter", ctrlKey: true });

    expect(calls).toEqual(["host"]);
  });
});

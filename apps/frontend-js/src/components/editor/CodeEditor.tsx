import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { yCollab, yRemoteSelectionsTheme } from "y-codemirror.next";
import { useEffect, useRef } from "react";
import type * as Y from "yjs";
import type * as awarenessProtocol from "y-protocols/awareness";
import { useVimMode } from "@/lib/vim/VimModeContext";
import { editorTheme } from "./theme";

// Bounds editor and Pyodide performance and localStorage usage, not the wire:
// Yjs sync payload size tracks edit history, not document length.
export const MAX_DOC_LENGTH = 100_000;

// Only user-originated transactions carry a userEvent annotation; remote y-sync
// updates do not. Reading it wrong must never reject a remote update, so an
// unrecognised transaction is allowed through rather than capped.
const enforceDocLengthCap = EditorState.changeFilter.of((tr) => {
  if (!tr.docChanged || tr.annotation(Transaction.userEvent) === undefined) return true;
  return tr.newDoc.length <= MAX_DOC_LENGTH;
});

export interface CodeEditorProps {
  initialDoc: string;
  onChange: (doc: string) => void;
  ytext?: Y.Text;
  awareness?: awarenessProtocol.Awareness | null;
}

export function CodeEditor({ initialDoc, onChange, ytext, awareness }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const viewRef = useRef<EditorView | null>(null);
  const vimCompartmentRef = useRef(new Compartment());
  const { vimMode } = useVimMode();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const vimCompartment = vimCompartmentRef.current;

    const state = EditorState.create({
      // yCollab syncs later changes but does not backfill what the Y.Text
      // already holds, so the initial state must be read from it directly.
      doc: ytext ? ytext.toString() : initialDoc,
      extensions: [
        // Must precede defaultKeymap so vim's own bindings (Escape, hjkl, etc.)
        // take priority over CodeMirror's defaults when enabled.
        vimCompartment.of(vimMode ? [vim()] : []),
        lineNumbers(),
        highlightActiveLine(),
        history(),
        indentOnInput(),
        bracketMatching(),
        // Consumes Mod-Enter before defaultKeymap's plain Enter binding can
        // insert a newline, so the global Run shortcut doesn't also edit the doc.
        keymap.of([
          { key: "Mod-Enter", run: () => true },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        python(),
        editorTheme,
        yRemoteSelectionsTheme,
        EditorView.lineWrapping,
        enforceDocLengthCap,
        ...(ytext ? [yCollab(ytext, awareness ?? null)] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // initialDoc seeds the editor once and later changes to it are ignored on
    // purpose, but the view must be rebuilt whenever the Y.Text identity
    // changes, or it stays bound to a document nobody is syncing any more.
    // vimMode is intentionally excluded: toggling it is handled below via the
    // compartment so it doesn't tear down and resync the whole editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytext]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: vimCompartmentRef.current.reconfigure(vimMode ? [vim()] : []),
    });
  }, [vimMode]);

  return <div ref={containerRef} aria-label="code editor" className="h-full w-full text-sm" />;
}

import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { yCollab, yRemoteSelectionsTheme } from "y-codemirror.next";
import { useEffect, useRef } from "react";
import type * as Y from "yjs";
import type * as awarenessProtocol from "y-protocols/awareness";
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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      // yCollab syncs later changes but does not backfill what the Y.Text
      // already holds, so the initial state must be read from it directly.
      doc: ytext ? ytext.toString() : initialDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        indentOnInput(),
        bracketMatching(),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
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

    return () => {
      view.destroy();
    };
    // initialDoc seeds the editor once and later changes to it are ignored on
    // purpose, but the view must be rebuilt whenever the Y.Text identity
    // changes, or it stays bound to a document nobody is syncing any more.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytext]);

  return <div ref={containerRef} aria-label="code editor" className="h-full w-full text-sm" />;
}

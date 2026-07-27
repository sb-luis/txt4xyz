import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { yCollab, yRemoteSelectionsTheme } from "y-codemirror.next";
import { useEffect, useRef } from "react";
import type * as Y from "yjs";
import type * as awarenessProtocol from "y-protocols/awareness";
import { editorHighlightStyle, editorTheme } from "./theme";

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
        syntaxHighlighting(editorHighlightStyle),
        editorTheme,
        yRemoteSelectionsTheme,
        EditorView.lineWrapping,
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

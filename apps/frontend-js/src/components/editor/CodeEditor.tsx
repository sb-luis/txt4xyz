import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { editorHighlightStyle, editorTheme } from "./theme";

export interface CodeEditorProps {
  initialDoc: string;
  onChange: (doc: string) => void;
}

export function CodeEditor({ initialDoc, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: initialDoc,
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
        EditorView.lineWrapping,
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
    // Only the very first mount's initialDoc seeds the editor; later prop changes are ignored on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} aria-label="code editor" className="h-full w-full text-sm" />;
}

import { syntaxHighlighting } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";
import { forwardRef, useMemo } from "react";
import type * as Y from "yjs";
import type * as awarenessProtocol from "y-protocols/awareness";
import { Txt4Editor } from "@txt4/core";
import type { ExtensionInput, Txt4EditorHandle } from "@txt4/core";
import { collabExtension } from "@txt4/collab";
import { langPySupport } from "@txt4/lang-py";
import { useVimMode } from "@/components/settings/VimModeContext";
import { editorTheme, syntaxHighlightStyle } from "./theme";

export interface CodeEditorProps {
  initialDoc: string;
  onChange: (doc: string) => void;
  ytext?: Y.Text;
  awareness?: awarenessProtocol.Awareness | null;
  flashKey?: number;
  currentLine?: number | null;
}

export type CodeEditorHandle = Txt4EditorHandle;

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { initialDoc, onChange, ytext, awareness, flashKey, currentLine },
  ref,
) {
  const { vimMode } = useVimMode();

  const extensions: ExtensionInput[] = useMemo(
    () => [
      // Must precede defaultKeymap so vim's own bindings (Escape, hjkl, etc.)
      // take priority over CodeMirror's defaults when enabled.
      ...(vimMode ? [{ extension: vim(), position: "before" as const }] : []),
      langPySupport(),
      syntaxHighlighting(syntaxHighlightStyle),
      editorTheme,
      ...(ytext ? [collabExtension(ytext, awareness ?? null)] : []),
    ],
    [vimMode, ytext, awareness],
  );

  return (
    <div className="h-full w-full text-sm">
      <Txt4Editor
        ref={ref}
        initialDoc={ytext ? ytext.toString() : initialDoc}
        onChange={onChange}
        extensions={extensions}
        flashKey={flashKey}
        currentLine={currentLine}
      />
    </div>
  );
});

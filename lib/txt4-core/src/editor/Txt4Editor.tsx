import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { currentLineField, setCurrentLine } from "./internal/currentLine.js";
import { DEFAULT_MAX_DOC_LENGTH, enforceDocLengthCap } from "./internal/docLengthCap.js";
import { splitExtensions } from "./internal/extensionSplit.js";
import type { ExtensionInput } from "./internal/extensionSplit.js";
import { runFlashField, setRunFlash } from "./internal/runFlash.js";
import { playbackTheme } from "./internal/playbackTheme.js";
import type { Txt4Colors } from "./internal/playbackTheme.js";

export type { ExtensionInput };
export { DEFAULT_MAX_DOC_LENGTH };

// briefly highlight every line, then fade back.
const RUN_FLASH_MS = 350;

export interface Txt4EditorProps {
  initialDoc: string;
  onChange: (doc: string) => void;
  extensions?: ExtensionInput[];
  flashKey?: number;
  currentLine?: number | null;
  maxDocLength?: number;
  colors?: Txt4Colors;
}

export interface Txt4EditorHandle {
  replaceContent: (newDoc: string) => void;
}

export const Txt4Editor = forwardRef<Txt4EditorHandle, Txt4EditorProps>(function Txt4Editor(
  {
    initialDoc,
    onChange,
    extensions,
    flashKey,
    currentLine,
    maxDocLength = DEFAULT_MAX_DOC_LENGTH,
    colors,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const viewRef = useRef<EditorView | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialFlashKeyRef = useRef(true);
  const beforeCompartmentRef = useRef(new Compartment());
  const afterCompartmentRef = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const { before, after } = splitExtensions(extensions ?? []);
    const beforeCompartment = beforeCompartmentRef.current;
    const afterCompartment = afterCompartmentRef.current;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        beforeCompartment.of(before),
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        // Consumes Mod-Enter before defaultKeymap's plain Enter binding can
        // insert a newline, so a host's global "run" shortcut doesn't also
        // edit the doc.
        keymap.of([
          { key: "Mod-Enter", run: () => true },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.lineWrapping,
        enforceDocLengthCap(maxDocLength),
        playbackTheme(colors ?? {}),
        runFlashField,
        currentLineField,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        afterCompartment.of(after),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // initialDoc seeds the editor once and later changes to it are ignored on
    // purpose. maxDocLength is intentionally excluded too, since it's only
    // ever read at construction. extensions changes are handled by the
    // reconfigure effect below via the two compartments, not by remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isInitialExtensionsRef = useRef(true);
  useEffect(() => {
    if (isInitialExtensionsRef.current) {
      isInitialExtensionsRef.current = false;
      return;
    }
    const view = viewRef.current;
    if (!view) return;
    const { before, after } = splitExtensions(extensions ?? []);
    view.dispatch({
      effects: [
        beforeCompartmentRef.current.reconfigure(before),
        afterCompartmentRef.current.reconfigure(after),
      ],
    });
  }, [extensions]);

  useEffect(() => {
    if (flashKey === undefined) return;
    if (isInitialFlashKeyRef.current) {
      isInitialFlashKeyRef.current = false;
      return;
    }
    if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    viewRef.current?.dispatch({ effects: setRunFlash.of(true) });
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = null;
      viewRef.current?.dispatch({ effects: setRunFlash.of(false) });
    }, RUN_FLASH_MS);
  }, [flashKey]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentLine === undefined) return;
    viewRef.current?.dispatch({ effects: setCurrentLine.of(currentLine) });
  }, [currentLine]);

  useImperativeHandle(
    ref,
    () => ({
      replaceContent(newDoc) {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: newDoc },
        });
      },
    }),
    [],
  );

  return <div ref={containerRef} aria-label="code editor" style={{ height: "100%", width: "100%" }} />;
});

import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      color: "var(--color-app-fg)",
      backgroundColor: "var(--color-app-surface)",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-content": {
      caretColor: "var(--color-app-fg)",
      fontFamily: "var(--font-mono)",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--color-app-fg)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "color-mix(in oklch, var(--color-app-accent) 30%, transparent)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-app-surface)",
      color: "var(--color-app-muted)",
      border: "none",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 10px 0 0",
      margin: "0",
      minWidth: "0",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--editor-active-line)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--editor-active-line)",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
  },
  { dark: true },
);

// With no hue left to lean on, tokens are told apart by lightness *and*
// weight/style — two grays of similar value would otherwise be indistinguishable.
export const editorHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--editor-keyword)", fontWeight: "bold" },
  { tag: tags.controlKeyword, color: "var(--editor-keyword)", fontWeight: "bold" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--editor-string)" },
  { tag: tags.comment, color: "var(--editor-comment)", fontStyle: "italic" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--editor-number)" },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: "var(--editor-function)",
    fontWeight: "bold",
  },
  { tag: tags.definition(tags.variableName), color: "var(--color-app-fg)" },
  { tag: tags.operator, color: "var(--color-app-fg)" },
  { tag: tags.className, color: "var(--editor-function)", fontWeight: "bold" },
]);

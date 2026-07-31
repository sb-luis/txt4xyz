import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export const syntaxHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--syntax-keyword)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--syntax-string)" },
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--syntax-comment)", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--syntax-function)" },
  { tag: [tags.operator, tags.punctuation], color: "var(--syntax-operator)" },
  { tag: tags.definition(tags.variableName), color: "var(--foreground)" },
  { tag: [tags.bool, tags.null, tags.self], color: "var(--syntax-number)" },
  { tag: tags.className, color: "var(--syntax-type)" },
]);

export const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    height: "100%",
  },
  ".cm-content":{
    padding: "1rem 1rem 0 0.5rem",
  },
  ".cm-lineNumbers .cm-gutterElement":{
    padding: "0 0 0 1rem",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--secondary)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--secondary)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--cursor) !important",
    backgroundColor: "var(--cursor)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--selection-bg) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--selection-bg) !important",
  },
  ".cm-fat-cursor": {
    backgroundColor: "var(--cursor) !important",
  },
  "&:not(.cm-focused) .cm-fat-cursor": {
    outlineColor: "var(--cursor) !important",
  },
});
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
    ".cm-activeLine": {
      backgroundColor: "color-mix(in oklch, var(--color-app-border) 40%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in oklch, var(--color-app-border) 40%, transparent)",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
  },
  { dark: true },
);

export const editorHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--color-app-accent)" },
  { tag: tags.controlKeyword, color: "var(--color-app-accent)" },
  { tag: [tags.string, tags.special(tags.string)], color: "oklch(0.8 0.13 145)" },
  { tag: tags.comment, color: "var(--color-app-muted)", fontStyle: "italic" },
  { tag: [tags.number, tags.bool, tags.null], color: "oklch(0.78 0.14 60)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "oklch(0.8 0.1 230)" },
  { tag: tags.definition(tags.variableName), color: "var(--color-app-fg)" },
  { tag: tags.operator, color: "var(--color-app-fg)" },
  { tag: tags.className, color: "oklch(0.8 0.1 230)" },
]);

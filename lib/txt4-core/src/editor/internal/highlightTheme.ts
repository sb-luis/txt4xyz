import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Bakes a fixed syntax-highlighting palette in as an extension, rather than
// requiring a consumer to supply their own HighlightStyle — keeps the package
// usable with zero CSS setup, matching self-contained-deep-module. Shared
// here (not per-language) because tags like tags.keyword are universal:
// syntaxHighlighting is a CodeMirror extension, so if each language package
// contributed its own, composing two languages' extensions would make the
// effective palette depend on array order.
export const txt4HighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: "#c678dd" },
    { tag: tags.string, color: "#98c379" },
    { tag: tags.number, color: "#d19a66" },
    { tag: tags.comment, color: "#5c6370", fontStyle: "italic" },
  ]),
);

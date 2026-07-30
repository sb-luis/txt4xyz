import { EditorView } from "@codemirror/view";

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
});

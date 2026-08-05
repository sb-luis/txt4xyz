import { EditorView } from "@codemirror/view";

export const DEFAULT_RUN_COLOR = "#f5d90a";

export interface Txt4Colors {
  runColor?: string;
}

// Bakes the run-flash and current-line decoration colors in as a theme,
// rather than requiring a consumer to supply global CSS that happens to
// match our internal class names — keeps the package usable with zero CSS
// setup, matching self-contained-deep-module. Both decorations share a
// single runColor: they're the same visual language (this line is/was
// executing), just flash vs. steady-state.
export function playbackTheme({ runColor = DEFAULT_RUN_COLOR }: Txt4Colors) {
  return EditorView.theme({
    ".txt4-run-flash": {
      animation: "txt4-run-flash-fade 350ms ease-out",
    },
    ".txt4-current-line": {
      backgroundColor: runColor,
    },
    "@keyframes txt4-run-flash-fade": {
      from: { backgroundColor: runColor },
      to: { backgroundColor: "transparent" },
    },
  });
}

import { Decoration, EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";

export const setRunFlash = StateEffect.define<boolean>();

export const runFlashField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (!effect.is(setRunFlash)) continue;
      if (!effect.value) return Decoration.none;
      const lineDecorations = [];
      for (let i = 1; i <= tr.state.doc.lines; i++) {
        lineDecorations.push(Decoration.line({ class: "txt4-run-flash" }).range(tr.state.doc.line(i).from));
      }
      return Decoration.set(lineDecorations);
    }
    return decorations.map(tr.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

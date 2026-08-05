import { Decoration, EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";

export const setCurrentLine = StateEffect.define<number | null>();

export const currentLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (!effect.is(setCurrentLine)) continue;
      if (effect.value === null || effect.value < 1 || effect.value > tr.state.doc.lines) {
        return Decoration.none;
      }
      const line = tr.state.doc.line(effect.value);
      return Decoration.set([Decoration.line({ class: "txt4-current-line" }).range(line.from)]);
    }
    return decorations.map(tr.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

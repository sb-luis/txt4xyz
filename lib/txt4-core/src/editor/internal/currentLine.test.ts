import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { currentLineField, setCurrentLine } from "./currentLine";

function stateFor(doc: string) {
  return EditorState.create({ doc, extensions: [currentLineField] });
}

describe("currentLineField", () => {
  it("starts with no decoration", () => {
    const state = stateFor("a\nb\nc");
    expect(state.field(currentLineField).size).toBe(0);
  });

  it("decorates exactly the given line", () => {
    let state = stateFor("a\nb\nc");
    state = state.update({ effects: setCurrentLine.of(2) }).state;
    const decorations = state.field(currentLineField);
    expect(decorations.size).toBe(1);
    let from = -1;
    decorations.between(0, state.doc.length, (f) => {
      from = f;
    });
    expect(state.doc.lineAt(from).number).toBe(2);
  });

  it("clears the decoration when set to null", () => {
    let state = stateFor("a\nb\nc");
    state = state.update({ effects: setCurrentLine.of(2) }).state;
    state = state.update({ effects: setCurrentLine.of(null) }).state;
    expect(state.field(currentLineField).size).toBe(0);
  });

  it("clears rather than throwing for an out-of-range line", () => {
    let state = stateFor("a\nb\nc");
    state = state.update({ effects: setCurrentLine.of(99) }).state;
    expect(state.field(currentLineField).size).toBe(0);
  });
});

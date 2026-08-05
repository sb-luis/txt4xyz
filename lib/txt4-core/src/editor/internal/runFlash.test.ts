import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { runFlashField, setRunFlash } from "./runFlash";

function stateFor(doc: string) {
  return EditorState.create({ doc, extensions: [runFlashField] });
}

describe("runFlashField", () => {
  it("starts with no decorations", () => {
    const state = stateFor("a\nb\nc");
    expect(state.field(runFlashField).size).toBe(0);
  });

  it("decorates every line when flashed on", () => {
    let state = stateFor("a\nb\nc");
    state = state.update({ effects: setRunFlash.of(true) }).state;
    expect(state.field(runFlashField).size).toBe(3);
  });

  it("clears all decorations when flashed off", () => {
    let state = stateFor("a\nb\nc");
    state = state.update({ effects: setRunFlash.of(true) }).state;
    state = state.update({ effects: setRunFlash.of(false) }).state;
    expect(state.field(runFlashField).size).toBe(0);
  });

  it("maps decorations through document edits instead of dropping them", () => {
    let state = stateFor("a\nb\nc");
    state = state.update({ effects: setRunFlash.of(true) }).state;
    state = state.update({ changes: { from: 0, insert: "x" } }).state;
    expect(state.field(runFlashField).size).toBe(3);
  });
});

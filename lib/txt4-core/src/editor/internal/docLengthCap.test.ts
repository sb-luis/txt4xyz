import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { enforceDocLengthCap } from "./docLengthCap";

function stateFor(doc: string, maxDocLength: number) {
  return EditorState.create({ doc, extensions: [enforceDocLengthCap(maxDocLength)] });
}

describe("enforceDocLengthCap", () => {
  it("rejects a user-originated edit that would exceed the cap", () => {
    const state = stateFor("x".repeat(8), 10);
    const next = state.update({
      changes: { from: state.doc.length, insert: "abc" },
      userEvent: "input.type",
    }).state;
    expect(next.doc.length).toBe(8);
  });

  it("allows a user-originated edit within the cap", () => {
    const state = stateFor("x".repeat(8), 10);
    const next = state.update({
      changes: { from: state.doc.length, insert: "ab" },
      userEvent: "input.type",
    }).state;
    expect(next.doc.length).toBe(10);
  });

  it("never rejects a transaction without a userEvent annotation, even past the cap", () => {
    const state = stateFor("x".repeat(8), 10);
    const next = state.update({
      changes: { from: state.doc.length, insert: "y".repeat(50) },
    }).state;
    expect(next.doc.length).toBe(58);
  });
});

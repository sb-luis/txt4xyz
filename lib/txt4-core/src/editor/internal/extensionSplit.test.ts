import { describe, expect, it } from "vitest";
import { EditorView } from "@codemirror/view";
import { splitExtensions } from "./extensionSplit";

function marker(id: string) {
  return EditorView.contentAttributes.of({ "data-marker": id });
}

describe("splitExtensions", () => {
  it("defaults bare extensions and wrappers without a position to after", () => {
    const a = marker("a");
    const b = { extension: marker("b") };
    const { before, after } = splitExtensions([a, b]);

    expect(before).toHaveLength(0);
    expect(after).toEqual([a, b.extension]);
  });

  it("routes position: 'before' entries to before, preserving relative order", () => {
    const a = { extension: marker("a"), position: "before" as const };
    const b = { extension: marker("b"), position: "before" as const };
    const c = marker("c");
    const { before, after } = splitExtensions([a, b, c]);

    expect(before).toEqual([a.extension, b.extension]);
    expect(after).toEqual([c]);
  });

  it("preserves relative order within each bucket for mixed input", () => {
    const a = { extension: marker("a"), position: "after" as const };
    const b = { extension: marker("b"), position: "before" as const };
    const c = marker("c");
    const d = { extension: marker("d"), position: "before" as const };

    const { before, after } = splitExtensions([a, b, c, d]);

    expect(before).toEqual([b.extension, d.extension]);
    expect(after).toEqual([a.extension, c]);
  });

  it("returns empty arrays for empty input", () => {
    expect(splitExtensions([])).toEqual({ before: [], after: [] });
  });
});

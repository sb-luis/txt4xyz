import { describe, expect, it } from "vitest";
import { langJsRunner } from "./langJsRunner";
import { langJsSnippets } from "./snippets";

const EXPECTED: Record<string, { error: boolean; steps: "some" | "none" }> = {
  "happy-path": { error: false, steps: "some" },
  error: { error: true, steps: "some" },
  "single-line": { error: false, steps: "some" },
  "multi-arg-log": { error: false, steps: "some" },
  empty: { error: false, steps: "none" },
};

describe("langJsSnippets", () => {
  it("covers every snippet, so a new snippet cannot skip the guard below", () => {
    expect(langJsSnippets.map((s) => s.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(langJsSnippets)("$id runs as expected", async (snippet) => {
    const expected = EXPECTED[snippet.id];
    const { steps, error } = await langJsRunner.run(snippet.code);

    expect(error === null).toBe(!expected.error);
    if (expected.steps === "none") expect(steps.length).toBe(0);
    else expect(steps.length).toBeGreaterThan(0);
  });
});

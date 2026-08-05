import { describe, expect, it } from "vitest";
import { jsRunner } from "./jsRunner";

describe("jsRunner", () => {
  it("produces one step per executed line, in parity with xyzlang's model", async () => {
    const { steps, error } = await jsRunner.run('console.log("a")\nconsole.log(1 + 1)');
    expect(error).toBeNull();
    expect(steps).toEqual([
      { line: 1, outputs: [{ kind: "log", text: "a" }] },
      { line: 2, outputs: [{ kind: "log", text: "2" }] },
    ]);
  });

  it("joins multiple console.log arguments with a space, like the real console", async () => {
    const { steps, error } = await jsRunner.run('console.log("a", 1, "b")');
    expect(error).toBeNull();
    expect(steps).toEqual([{ line: 1, outputs: [{ kind: "log", text: "a 1 b" }] }]);
  });

  it("halts on a throwing line and reports it as the outcome error", async () => {
    const { steps, error } = await jsRunner.run('console.log("a")\nthrow new Error("boom")\nconsole.log("unreachable")');
    expect(error).toBe("boom");
    expect(steps).toEqual([{ line: 1, outputs: [{ kind: "log", text: "a" }] }, { line: 2, outputs: [] }]);
  });

  it("skips blank lines and comments without producing steps for them", async () => {
    const { steps, error } = await jsRunner.run('console.log("a")\n\n// a comment\nconsole.log("b")');
    expect(error).toBeNull();
    expect(steps.map((s) => s.line)).toEqual([1, 4]);
  });
});

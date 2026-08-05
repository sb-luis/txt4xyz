import { describe, expect, it } from "vitest";
import { interpretXyzlang } from "./xyzlangInterpreter";

describe("interpretXyzlang", () => {
  it("produces one step per line for a multi-line program", () => {
    const { steps, error } = interpretXyzlang('print "a"\nprint "b"');
    expect(error).toBeNull();
    expect(steps).toEqual([
      { line: 1, outputs: [{ kind: "log", text: "a" }] },
      { line: 2, outputs: [{ kind: "log", text: "b" }] },
    ]);
  });

  it("round-trips a let binding through a later print", () => {
    const { steps, error } = interpretXyzlang('let x = "hello"\nprint x');
    expect(error).toBeNull();
    expect(steps).toEqual([
      { line: 1, outputs: [] },
      { line: 2, outputs: [{ kind: "log", text: "hello" }] },
    ]);
  });

  it("halts on fail, recording it as the outcome error and not running later lines", () => {
    const { steps, error } = interpretXyzlang('print "a"\nfail "boom"\nprint "unreachable"');
    expect(error).toBe("boom");
    expect(steps).toEqual([
      { line: 1, outputs: [{ kind: "log", text: "a" }] },
      { line: 2, outputs: [] },
    ]);
  });

  it("skips blank lines and comments without producing steps for them", () => {
    const { steps, error } = interpretXyzlang('print "a"\n\n// a comment\nprint "b"');
    expect(error).toBeNull();
    expect(steps.map((s) => s.line)).toEqual([1, 4]);
  });
});

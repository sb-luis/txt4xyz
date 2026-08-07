import { describe, expect, it } from "vitest";
import { langJsStreamingRunner } from "./langJsRunner";

describe("langJsStreamingRunner", () => {
  it("calls onOutput once per console.log, in order", async () => {
    const outputs: unknown[] = [];
    const { error } = await langJsStreamingRunner.run('console.log("a")\nconsole.log(1 + 1)', (entry) =>
      outputs.push(entry),
    );
    expect(error).toBeNull();
    expect(outputs).toEqual([
      { kind: "log", text: "a" },
      { kind: "log", text: "2" },
    ]);
  });

  it("joins multiple console.log arguments with a space, like the real console", async () => {
    const outputs: unknown[] = [];
    const { error } = await langJsStreamingRunner.run('console.log("a", 1, "b")', (entry) => outputs.push(entry));
    expect(error).toBeNull();
    expect(outputs).toEqual([{ kind: "log", text: "a 1 b" }]);
  });

  it("resolves with the error message instead of rejecting, delivering prior output first", async () => {
    const outputs: unknown[] = [];
    const { error } = await langJsStreamingRunner.run(
      'console.log("a")\nthrow new Error("boom")\nconsole.log("unreachable")',
      (entry) => outputs.push(entry),
    );
    expect(error).toBe("boom");
    expect(outputs).toEqual([{ kind: "log", text: "a" }]);
  });

  it("runs a multi-line array literal unmodified — the __mark rewrite would inject a statement mid-expression and throw a SyntaxError", async () => {
    const outputs: unknown[] = [];
    const code = `const arr = [
  1,
  2
]
console.log(arr.length)`;
    const { error } = await langJsStreamingRunner.run(code, (entry) => outputs.push(entry));
    expect(error).toBeNull();
    expect(outputs).toEqual([{ kind: "log", text: "2" }]);
  });
});

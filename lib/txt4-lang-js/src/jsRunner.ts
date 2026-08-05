import type { ExecutionOutcome, ExecutionRunner } from "@txt4/core";

export type JsOutput = { kind: "log"; text: string };

// Dev-harness-only, unsafe for untrusted input: the whole program runs as a
// single `new Function` body (only ever the trusted samples in this
// sandbox), rewritten to call `__mark(lineNumber)` before every non-blank,
// non-comment line. That keeps `let`/`const` bindings shared across lines,
// the same way a real script would, while still letting us attribute each
// `console.log()` call to the line that produced it.
export const jsRunner: ExecutionRunner<JsOutput> = {
  async run(code) {
    const lines = code.split("\n");
    const steps: ExecutionOutcome<JsOutput>["steps"] = [];
    let currentStepIndex = -1;

    const mark = (lineNumber: number) => {
      steps.push({ line: lineNumber, outputs: [] });
      currentStepIndex = steps.length - 1;
    };
    const log = (...args: unknown[]) => {
      const text = args.map((value) => (typeof value === "string" ? value : String(value))).join(" ");
      steps[currentStepIndex].outputs.push({ kind: "log", text });
    };
    const console = { log };

    const rewritten = lines
      .map((line, i) => {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("//")) return "";
        return `__mark(${i + 1}); ${line}`;
      })
      .join("\n");

    try {
      const fn = new Function("__mark", "console", rewritten);
      fn(mark, console);
      return { steps, error: null };
    } catch (err) {
      return { steps, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

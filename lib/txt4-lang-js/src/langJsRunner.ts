import type { ExecutionOutcome, ExecutionRunner, StreamingExecutionRunner } from "@txt4/core";

export type LangJsOutput = { kind: "log"; text: string };

// Shared so run mode and debug mode can never render the same code differently.
function formatLogArgs(args: unknown[]): string {
  return args.map((value) => (typeof value === "string" ? value : String(value))).join(" ");
}

// Dev-harness-only, unsafe for untrusted input: the whole program runs as a
// single `new Function` body (only ever the trusted samples in this
// sandbox), rewritten to call `__mark(lineNumber)` before every non-blank,
// non-comment line. That keeps `let`/`const` bindings shared across lines,
// the same way a real script would, while still letting us attribute each
// `console.log()` call to the line that produced it.
export const langJsRunner: ExecutionRunner<LangJsOutput> = {
  async run(code) {
    const lines = code.split("\n");
    const steps: ExecutionOutcome<LangJsOutput>["steps"] = [];
    let currentStepIndex = -1;

    const mark = (lineNumber: number) => {
      steps.push({ line: lineNumber, outputs: [] });
      currentStepIndex = steps.length - 1;
    };
    const log = (...args: unknown[]) => {
      steps[currentStepIndex].outputs.push({ kind: "log", text: formatLogArgs(args) });
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

// Dev-harness-only, unsafe for untrusted input: the whole program runs as a
// single `new Function` body, synchronous and non-interruptible on the main
// thread.
export const langJsStreamingRunner: StreamingExecutionRunner<LangJsOutput> = {
  async run(code, onOutput) {
    const log = (...args: unknown[]) => {
      onOutput({ kind: "log", text: formatLogArgs(args) });
    };
    const console = { log };

    try {
      const fn = new Function("console", code);
      fn(console);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
};

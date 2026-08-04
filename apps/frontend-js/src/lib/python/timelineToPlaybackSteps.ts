import type { PlaybackStep } from "@/lib/playback/types";
import type { DisplayPayload, StepEvent } from "./protocol";
import type { OutputEntry } from "./runner";

function displayToOutputEntry(display: DisplayPayload): OutputEntry {
  switch (display.kind) {
    case "dataframe":
      return {
        kind: "dataframe",
        handle: display.handle,
        columns: display.columns,
        rows: display.rows,
        rowCount: display.rowCount,
        truncated: display.truncated,
      };
    case "plot":
      return { kind: "plot", svg: display.svg };
    case "html":
      return { kind: "html", html: display.html };
    case "image":
      return { kind: "image", mime: display.mime, dataBase64: display.dataBase64 };
    case "json":
      return { kind: "json", value: display.value };
  }
}

// Order within a step is stdout, then stderr, then display -- finer
// interleaving between them isn't preserved (buffered as separate arrays).
export function timelineToPlaybackSteps(steps: StepEvent[]): PlaybackStep<OutputEntry>[] {
  return steps.map((step) => ({
    line: step.line,
    outputs: [
      ...step.stdout.map((line): OutputEntry => ({ kind: "stdout", line })),
      ...step.stderr.map((line): OutputEntry => ({ kind: "stderr", line })),
      ...step.display.map(displayToOutputEntry),
    ],
  }));
}

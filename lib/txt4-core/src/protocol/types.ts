import type { PlaybackStep } from "../playback/types.js";

export interface ExecutionOutcome<TOutput> {
  steps: PlaybackStep<TOutput>[];
  error: string | null;
}

export interface ExecutionRunner<TOutput> {
  run(code: string): Promise<ExecutionOutcome<TOutput>>;
}

export type ExecutionMode = "run" | "debug";

export interface StreamingExecutionRunner<TOutput> {
  run(code: string, onOutput: (entry: TOutput) => void): Promise<{ error: string | null }>;
  // Present only when a run can genuinely be cancelled. A synchronous runner
  // omits it, so callers can offer Stop solely where it does something.
  stop?: () => void;
}

import type { PlaybackStep } from "../playback/types.js";

export interface ExecutionOutcome<TOutput> {
  steps: PlaybackStep<TOutput>[];
  error: string | null;
}

export interface ExecutionRunner<TOutput> {
  run(code: string): Promise<ExecutionOutcome<TOutput>>;
}

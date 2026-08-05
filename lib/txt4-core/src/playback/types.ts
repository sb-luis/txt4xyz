// Deliberately generic, no Pyodide/Yjs types, so this stays reusable if
// execution is ever driven by a different runtime.
export interface PlaybackStep<TOutput> {
  line: number;
  outputs: TOutput[];
}

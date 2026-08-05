# @txt4/lang-py

Headless Pyodide execution and Python formatting for txt4xyz. Emits validated
data; renders nothing — output rendering (OutputPane, DataFrameTable,
PlotView, etc.) stays in the consuming app.

## Known constraints

- **Ships TypeScript source, not `dist/` for consumption via the `@txt4/lang-py`
  path alias.** `runner.ts` spawns its worker with
  `new Worker(new URL("./runner.worker.ts", import.meta.url))`, which is a
  Vite-specific resolution that only works when the consumer's bundler
  processes this package's source directly. The `build`/`dist` output exists
  for a future npm publish, not for the current in-repo consumption path.
- **Requires a Vite-compatible bundler.** `runner.worker.ts` reads
  `import.meta.env.VITE_PYODIDE_INDEX_URL`; `import.meta.env` is declared
  locally in `src/vite-env.d.ts` rather than via `vite/client` so this package
  doesn't need vite itself as a dependency, but the consumer's bundler must
  still supply it at runtime.
- **One worker, one recording.** `runner.worker.ts` keeps its trace-recording
  state (`recording`, `pendingLine`, `pendingStdout`, `recordedSteps`,
  `flushPendingStep`, `onTraceLine`) as module globals rather than scoped to a
  call. This is safe because each `PythonRunnerClient` owns exactly one
  worker and only one run is ever in flight per worker, but it means the
  worker module cannot be reused to run two recordings concurrently.

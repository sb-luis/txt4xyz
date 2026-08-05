# @txt4/lang-xyz

"xyzlang" — a from-scratch, deliberately minimal test language used to
exercise `@txt4/core`'s editor and playback against a non-Python runtime.
Not a real language: just enough syntax (`print`, `let`, `fail`) to produce
multi-line output and an error/halt path.

Not yet published. Consumed via TypeScript path aliases and a matching Vite
`resolve.alias` pointing at `src/index.ts`.

## API

- `xyzlangRunner: ExecutionRunner<XyzOutput>` — runs xyzlang source and
  records a playback trace.
- `xyzlang(): LanguageSupport` — CodeMirror language support for syntax
  highlighting.
- `interpretXyzlang(code: string): ExecutionOutcome<XyzOutput>` — the
  interpreter itself, if you need the outcome without going through the
  `ExecutionRunner` protocol.
- `XyzOutput` — `{ kind: "log"; text: string }`, the shape of every output
  this runtime produces.

Depends on `@txt4/core` for the `ExecutionOutcome`/`ExecutionRunner`/
`PlaybackStep` protocol types.

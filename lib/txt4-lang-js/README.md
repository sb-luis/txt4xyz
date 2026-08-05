# @txt4/lang-js

A native-JavaScript `ExecutionRunner` for `@txt4/core`'s editor and playback.

**Development and prototyping runner only.** Per `plan/01-product.md`, JS
execution is out of product scope for txt4xyz. `apps/site-frontend` must
never depend on this package. If JS execution is ever built for real, it
must run in a sandboxed iframe — never in a worker or on the main thread,
which is how this package runs code (`new Function`, unsandboxed, safe only
for the trusted samples in `apps/playground`).

Not yet published. Consumed via TypeScript path aliases and a matching Vite
`resolve.alias` pointing at `src/index.ts`.

## API

- `jsRunner: ExecutionRunner<JsOutput>`
- `JsOutput` — `{ kind: "log"; text: string }`

Depends on `@txt4/core` only, for the `ExecutionOutcome`/`ExecutionRunner`
protocol types. Does not depend on `@txt4/lang-xyz`.

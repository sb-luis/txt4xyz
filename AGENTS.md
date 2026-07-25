# txt4.xyz

A collaborative, in-browser Python scratchpad. Python runs client-side in WebAssembly (Pyodide);
a from-scratch Go websocket server relays Yjs CRDT updates between participants. No auth, no
database — rooms are ephemeral and in-memory.

**The build plan lives in `plan/`. Start with `plan/00-start-here.md`,** which maps the other
documents and says which to load for the current phase. This file holds only the standing rules
that apply to every session.

## Monorepo layout

```
apps/frontend-js    Vite + React + TypeScript + Tailwind
apps/backend-go     Go websocket relay (added in Phase 2)
plan/               Build plan, split by domain — see plan/00-start-here.md
reference/          a sibling project — READ-ONLY, gitignored
```

`reference/` is a deployed Go + TypeScript app by the same author, checked out for reference. Its
root maps to that repo's root. It is the house-style guide and contains a working websocket hub
worth learning from — see `reference/AGENTS.md` and `reference/notes/architecture.md`.

**Never modify anything under `reference/`.** Read from it; copy into this repo deliberately.

## Verification

**Never start the dev server, backend, or any preview/build-and-run process, and never smoke-test
the app.** Verify with tests, typecheck, lint, and build only. Running and manual testing is left
to a human — say explicitly what needs smoke-testing rather than doing it.

Frontend (`apps/frontend-js`):

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

Backend (`apps/backend-go`):

```bash
gofmt -l . && go vet ./... && go build ./... && go test ./...
```

A non-empty `gofmt -l` is a failure. CI runs both suites; keep them green.

## Dependency versions

**Never write a dependency version from memory.** Resolve it:

```bash
npm view <package> version
```

```bash
curl -s "https://proxy.golang.org/<module>/@latest"
```

Pin what the registry returns. `plan/02-stack.md` lists a resolved known-good floor.

## Documentation lookups

This stack tracks recent majors where training data is stale or actively wrong — React 19,
Vite 8, Tailwind 4, TypeScript 7, ESLint 10, CodeMirror 6, Yjs, and Pyodide (whose versioning
scheme recently changed). **A Context7 docs MCP is connected — use it** for any API, config, or
migration question on those. Do not write API calls from memory for them.

Go stdlib, `coder/websocket`, and `golang.org/x/*` move slowly enough that this matters less.

## Conventions

Carried over from `reference/` — parity is deliberate, since one person maintains both.

### TypeScript / React

- Strict TS. Path alias `@/*` → `src/*`.
- ESLint flat config (`eslint.config.mjs`).
- `src/lib/<domain>/` for logic, types, and context; `src/components/<domain>/` for UI.
- Context pattern: `createContext<XValue | null>(null)` with a `useX()` hook that throws when
  used outside its provider.
- Tests are colocated `*.test.ts(x)`, Vitest + jsdom + Testing Library.
- Validate external data at the boundary with zod — do not trust unvalidated payloads.

### Go

- stdlib `net/http.ServeMux` with method patterns (`"GET /ws"`). No third-party router.
- Package-level doc comment stating the package's purpose and boundary.
- Typed domain errors in `errorsx`; handlers map error type → HTTP status.
- Services depend on a **narrow local interface**, not a concrete struct, so they can be mocked.
- Constructors are `New(...)` returning `*Service`.
- Colocated `_test.go` files.
- Comments explain **why**, not what.

### Comments — applies to every language

**Avoid comments at all costs.** Default to none. Code that needs a comment to be readable is
usually code that needs renaming or restructuring instead.

Write one only for something genuinely non-obvious that the code cannot say itself — a
non-intuitive constraint, a deliberate divergence, a subtle failure mode — and keep it to one or
two lines. Never write banner/section dividers, restatements of the next line, or narration of
what a config option obviously does.

Delete comments that no longer earn their place when you touch surrounding code.

### Websocket relay — non-negotiable

The server relays **opaque binary blobs** and has no CRDT logic. Three rules, each a silent
correctness bug if broken (full detail in `plan/05-reference-repo.md`):

1. Use `websocket.MessageBinary`, never `MessageText`.
2. **Never silently drop a message.** A full send buffer or a rate-limit violation closes the
   connection so the client reconnects and re-syncs. A dropped CRDT update is permanent
   divergence.
3. Never log room IDs or send them to analytics — a room ID is a bearer credential.

## Delegation

Architecture is decided by the orchestrating session, not by workers. If you are implementing
against a brief and hit a genuine structural question — a new module boundary, a changed exported
API, an unplanned dependency — **stop and report back** rather than inventing an answer.

## Git

- After a coherent piece of work, suggest a Conventional Commits-style message. **Never run
  `git commit` yourself.**
- Durable project notes belong in this repo (`plan/`, this file) rather than in session memory.

## Documentation

**Do not write documentation files without explicit approval from the user.** No `docs/`, no
READMEs, no guides — prose that restates what the code already says is repo bloat at this stage.
This is revisitable later (the portfolio README in `plan/07-portfolio.md` is a deliberate,
approved exception when Phase 4 arrives), but it is not a default.

If you genuinely need to record something for a future session, write it under **`plan/notes/`**.
`plan/` and `reference/` are gitignored, so notes there stay out of the committed tree.

## Workspace boundary

**Read and write only inside this repository.** Do not read from or write to paths outside the
project root — no home directory, no system temp, no sibling checkouts. `reference/` is inside
the repo and remains readable (read-only, as above).

# @txt4/core

A reusable, language-agnostic code editor with scrubbable line-by-line
execution playback. Built on CodeMirror 6, unstyled, no enforced theme or
language — you provide the language and appearance, this package provides
the editor shell and the playback state machine.

Not yet published. Consumers resolve it via TypeScript path aliases and a
matching Vite `resolve.alias` pointing at `src/index.ts` — there is no root
package.json in this repo and no npm workspace.

## `Txt4Editor`

```tsx
import { Txt4Editor } from "@txt4/core";
import { python } from "@codemirror/lang-python";

<Txt4Editor
  initialDoc={code}
  onChange={setCode}
  extensions={[python()]}
  currentLine={playback.currentLine}
  flashKey={runCount}
/>;
```

### Props

- `initialDoc: string` — seeds the document once on mount. Later changes to
  this prop are ignored; remount (e.g. with a `key`) to load new content.
- `onChange: (doc: string) => void` — called with the full document text on
  every local edit.
- `extensions?: ExtensionInput[]` — everything CodeMirror: language support,
  syntax highlighting, themes, collaborative editing (`yCollab`), vim mode,
  keymaps. Core installs none of these itself. Each entry is either a bare
  CodeMirror `Extension`, or `{ extension, position }` where `position` is
  `"before"` or `"after"` (default `"after"`) relative to the editor's own
  base extensions (line numbers, history, bracket matching, its default
  keymap, etc.). Use `"before"` when an extension needs to win precedence
  over the editor's own keymap — vim mode is the canonical example, since its
  Escape/hjkl bindings must be registered before CodeMirror's `defaultKeymap`.
- `flashKey?: number` — bump this number to briefly flash every line (e.g.
  when a run starts). No-op on initial mount even if already set.
- `currentLine?: number | null` — highlights this 1-based line as the
  "currently executing" line; `null`/`undefined` clears the highlight.
- `maxDocLength?: number` — caps user-originated edits (defaults to
  `DEFAULT_MAX_DOC_LENGTH`, 100,000 characters). Never rejects edits without
  a `userEvent` annotation, so remote sync updates (e.g. via `yCollab`) are
  never blocked by the cap.

### Ref handle

```ts
interface Txt4EditorHandle {
  replaceContent(newDoc: string): void;
}
```

Deliberately minimal — no raw `EditorView` is exposed.

### Styling contract

Core ships zero CSS and no theme. It applies two stable, prefixed class
names and leaves all appearance to you:

- `txt4-run-flash` — applied to every line while `flashKey`'s flash window is
  active.
- `txt4-current-line` — applied to the line at `currentLine`.

Syntax highlighting is entirely consumer-owned too — pass a
`syntaxHighlighting(yourHighlightStyle)` extension the same way you pass
language support.

## Playback

`usePlayback<TOutput>(steps, error, onRequestRecording)` is a generic state
machine over a recorded execution trace. `steps`/`error` are owned by the
caller: pass `null`/`null` until a run has been recorded (typically via an
`ExecutionRunner`), and null them again on any code edit so a stale timeline
is never replayed against different code.

```ts
const playback = usePlayback<MyOutput>(steps, error, () => {
  runner.run(code).then(({ steps, error }) => {
    setSteps(steps);
    setError(error);
  });
});
```

Returns `phase` (`"idle" | "recording" | "playing" | "done"`),
`currentLine`, `stepNumber`, `visibleOutputs` (outputs flattened up through
the current step), `errorRevealed`, `canStepBack`/`canStepForward`/`canReset`,
and `play`/`pause`/`stepForward`/`stepBack`/`reset`/`restart`.

## Execution protocol

```ts
interface PlaybackStep<TOutput> {
  line: number;
  outputs: TOutput[];
}

interface ExecutionOutcome<TOutput> {
  steps: PlaybackStep<TOutput>[];
  error: string | null;
}

interface ExecutionRunner<TOutput> {
  run(code: string): Promise<ExecutionOutcome<TOutput>>;
}
```

`ExecutionRunner` is the only abstraction this package defines for "running
code" — a single async method, no assumptions about workers, tracing
mechanism, or output shape. Implement it for any language; `TOutput` is free
to be whatever your runtime produces (dataframes, plots, plain log lines).

## Trying it out

See `apps/playground`, a dev-only workbench that consumes this package
(along with `@txt4/lang-xyz` and `@txt4/lang-js`) via source-level path aliases, the
same way `apps/frontend-js` will.

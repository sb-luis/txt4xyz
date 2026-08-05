# txt4-playground

A dev-only workbench that consumes all `@txt4/*` packages and composes them
in ways the production site never would. It is where a package gets
exercised before `apps/frontend-js` depends on it. It is not deployed.

Currently switches between two intentionally non-Python `ExecutionRunner`s
against `@txt4/core`'s editor and playback: native JS (`@txt4/lang-js`) and a
from-scratch minimal test language, "xyzlang" (`@txt4/lang-xyz`).

Resolves every `@txt4/*` package the same way `apps/frontend-js` resolves
`lib/*` packages: TypeScript path aliases and matching Vite aliases pointing
at each package's `src/index.ts`, never a deeper path — so a package's
internals stay unreachable from outside it.

```bash
npm install
npm run dev
```

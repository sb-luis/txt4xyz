# txt4.xyz

A collaborative Python scratchpad with no server-side persistence. Python runs in
your browser under WebAssembly, edits merge as CRDT updates on the client, and a
from-scratch Go relay forwards opaque bytes between peers. The server never parses
a message, stores a document, or runs your code, late joiners sync from each other.

**[txt4.xyz](https://txt4.xyz)** — create a room, share the link and start editing.

## Architecture

```
   Browser                      Browser
┌──────────────┐             ┌──────────────┐
│  CodeMirror  │             │  CodeMirror  │
│       ↕      │             │       ↕      │
│   Yjs doc    │             │   Yjs doc    │
│       ↓      │             │       ↓      │
│   Pyodide    │             │   Pyodide    │
│ (web worker) │             │ (web worker) │
└──────┬───────┘             └──────┬───────┘
       └─────────────┬──────────────┘
                     │ wss
              ┌──────┴──────┐
              │  Go relay   │
              └─────────────┘
```

**CRDT lives on the client; the server is a dumb relay.** It joins a room, broadcasts every
  frame byte-for-byte to the other members, and enforces limits. It never parses a Yjs message.

**No database.** A late joiner syncs from its *peers*, not the server, so
  the relay holds no document state. When the last member leaves, the room ceases to exist.
**Code executes client-side in a web worker,** each
  run gets a fresh Python namespace.

A 128-bit random room ID in the URL *fragment* (so it is never sent in
a request or a `Referer` header). 

Rooms are **anonymous** and **ephemeral**.

## Install dependencies

Declared in [`package.json`](apps/frontend-js/package.json) and
[`go.mod`](apps/backend-go/go.mod).

```bash
cd apps/frontend-js && npm install
```

```bash
cd apps/backend-go && go mod download
```

## Development

```bash
cd apps/backend-go && go run .
```

```bash
cd apps/frontend-js && npm run dev
```

## Tests

```bash
cd apps/frontend-js && npx tsc --noEmit && npm run lint && npm test && npm run build
```

```bash
cd apps/backend-go && gofmt -l . && go vet ./... && go build ./... && go test -race ./...
```

`npm run test:integration` runs the real client provider against a real relay; it needs
`VITE_RELAY_URL` set and skips otherwise. CI runs all three suites.

/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const lib = (name: string) => path.resolve(import.meta.dirname, `../../lib/${name}/src/index.ts`);

// Must be the ESM resolver: require.resolve returns the CJS entry, a second module instance (see plan/notes/module-duplication.md).
const singleton = (name: string) => fileURLToPath(import.meta.resolve(name));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@txt4/core": lib("txt4-core"),
      "@txt4/lang-js": lib("txt4-lang-js"),
      "@txt4/lang-py": lib("txt4-lang-py"),
      "@txt4/collab": lib("txt4-collab"),
      "@codemirror/state": singleton("@codemirror/state"),
      "@codemirror/view": singleton("@codemirror/view"),
      "@codemirror/language": singleton("@codemirror/language"),
      "@codemirror/commands": singleton("@codemirror/commands"),
      yjs: singleton("yjs"),
      "y-codemirror.next": singleton("y-codemirror.next"),
      // y-protocols has no root export; alias the subpaths lib/txt4-collab
      // actually imports rather than the bare package name.
      "y-protocols/awareness": singleton("y-protocols/awareness"),
      "y-protocols/sync": singleton("y-protocols/sync"),
    },
    // Without this, lib/* packages' bare imports resolve to a second copy in lib/*/node_modules — two Reacts break hooks, silently.
    dedupe: [
      "react",
      "react-dom",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/lang-python",
      "@codemirror/lang-javascript",
      "@lezer/highlight",
      "@lezer/common",
      "yjs",
      "y-protocols",
      "y-codemirror.next",
      "lib0",
    ],
  },
  server: {
    proxy: { "/ws": { target: "ws://localhost:4000", ws: true } },
    // Serving lib/* from outside the project root requires an explicit allow.
    fs: { allow: [import.meta.dirname, path.resolve(import.meta.dirname, "../../lib")] },
  },
  test: {
    environment: "jsdom",
    globals: true,
    server: {
      deps: {
        inline: [
          /^@txt4\//,
          /@codemirror\//,
          /@lezer\//,
          /^codemirror$/,
          /y-codemirror\.next/,
          /\/yjs\//,
          /y-protocols/,
          /\/lib0\//,
        ],
      },
    },
  },
});

/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const lib = (name: string) => path.resolve(import.meta.dirname, `../../lib/${name}/src/index.ts`);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@txt4/core": lib("txt4-core"),
      "@txt4/lang-xyz": lib("txt4-lang-xyz"),
      "@txt4/lang-js": lib("txt4-lang-js"),
    },
    // lib packages are compiled from source out of their own directories, so
    // their bare imports would otherwise resolve to a second copy in
    // lib/*/node_modules. Two Reacts break hooks; two @codemirror/state break
    // the editor with no error at all.
    dedupe: [
      "react",
      "react-dom",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/state",
      "@codemirror/view",
      "@lezer/highlight",
      "@lezer/common",
    ],
  },
  server: {
    // Serving lib/* from outside the project root requires an explicit allow.
    fs: { allow: [import.meta.dirname, path.resolve(import.meta.dirname, "../../lib")] },
  },
  test: {
    environment: "jsdom",
    globals: true,
    server: { deps: { inline: [/^@txt4\//, /@codemirror\//, /@lezer\//, /^codemirror$/] } },
  },
});

/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const lib = (name: string) => path.resolve(import.meta.dirname, `../../lib/${name}/src/index.ts`);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@txt4/core": lib("txt4-core"),
      "@txt4/lang-js": lib("txt4-lang-js"),
      "@txt4/lang-py": lib("txt4-lang-py"),
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
      "@codemirror/lang-python",
      "@codemirror/lang-javascript",
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

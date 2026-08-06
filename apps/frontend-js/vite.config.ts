/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // In production the relay is same-origin, so the client derives its URL from
  // the page. In dev the page is Vite and the relay is a separate process.
  server: {
    proxy: {
      "/ws": { target: "ws://localhost:4000", ws: true },
    },
    // Serving lib/* from outside the project root requires an explicit allow.
    fs: { allow: [import.meta.dirname, path.resolve(import.meta.dirname, "../../lib")] },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    // "source" resolves @txt4/* straight to src via package exports, ahead of
    // Vite 8's client defaults (module, browser, dev/prod) which must stay
    // present or bare-import resolution for every other dependency breaks.
    conditions: ["source", "module", "browser", "development", "production"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Vitest stubs out CSS imports by default (they don't affect test
    // behavior in jsdom); index.css.test.ts needs the real text via `?raw`
    // to check token contrast, so opt that one file back into real content.
    css: { include: [/index\.css/] },
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

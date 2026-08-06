/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "source" resolves @txt4/* straight to src via package exports, ahead of
    // Vite 8's client defaults (module, browser, dev/prod) which must stay
    // present or bare-import resolution for every other dependency breaks.
    conditions: ["source", "module", "browser", "development", "production"],
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

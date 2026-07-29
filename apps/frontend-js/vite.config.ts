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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Vitest stubs out CSS imports by default (they don't affect test
    // behavior in jsdom); index.css.test.ts needs the real text via `?raw`
    // to check token contrast, so opt that one file back into real content.
    css: { include: [/index\.css/] },
  },
});

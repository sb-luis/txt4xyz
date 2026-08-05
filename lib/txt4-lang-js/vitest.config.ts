import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@txt4/core": path.resolve(import.meta.dirname, "../txt4-core/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["**/node_modules/**"],
    server: {
      deps: {
        inline: [/^@txt4\//],
      },
    },
  },
});

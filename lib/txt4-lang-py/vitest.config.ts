import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["**/node_modules/**", "dev/**"],
  },
  resolve: {
    alias: {
      "@txt4/core": new URL("../txt4-core/src/index.ts", import.meta.url).pathname,
    },
  },
});

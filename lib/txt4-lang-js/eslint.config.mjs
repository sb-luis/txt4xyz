import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// TS is pinned to 6.0.3, not 7.x: typescript-eslint caps at `<6.1.0`.
// `js.configs.recommended` is load-bearing — tseslint only turns core rules
// off, never on, so without it no-empty and friends pass silently.

const eslintConfig = defineConfig([
  globalIgnores(["**/dist/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
]);

export default eslintConfig;

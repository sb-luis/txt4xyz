import { describe, expect, it } from "vitest";
import { wcagContrast } from "culori";
// `?raw` (typed by vite/client, see vite-env.d.ts) pulls the file in as a
// plain string instead of `node:fs`, which this browser-targeted tsconfig
// doesn't have types for.
import css from "./index.css?raw";

// Contrast is a correctness property of index.css, not a component. This test
// reads the raw CSS (not treated as a stylesheet) and checks the WCAG ratios
// that the design tokens must maintain, so a future edit that quietly breaks
// contrast fails CI instead of requiring another manual screenshot catch.

const TOKEN_NAMES = [
  "app-bg",
  "app-surface",
  "app-border",
  "app-fg",
  "app-muted",
  "app-accent",
  "app-accent-fg",
  "app-error",
  "editor-keyword",
  "editor-string",
  "editor-number",
  "editor-function",
  "editor-comment",
] as const;

type TokenName = (typeof TOKEN_NAMES)[number];
type Palette = Record<TokenName, string>;

function extractBlock(source: string, selectorPattern: RegExp): string {
  const match = source.match(selectorPattern);
  if (!match || match.index === undefined) {
    throw new Error(`Could not find selector ${selectorPattern} in index.css`);
  }
  const braceStart = source.indexOf("{", match.index);
  const braceEnd = source.indexOf("}", braceStart);
  return source.slice(braceStart, braceEnd);
}

function extractPalette(block: string): Palette {
  const palette = {} as Palette;
  for (const name of TOKEN_NAMES) {
    const re = new RegExp(`--${name}:\\s*([^;]+);`);
    const match = block.match(re);
    if (!match) {
      throw new Error(`Could not find --${name} declaration in block`);
    }
    palette[name] = match[1].trim();
  }
  return palette;
}

const lightBlock = extractBlock(css, /:root\s*(?!\[)\{/);
const darkBlock = extractBlock(css, /:root\[data-theme=["']dark["']\]\s*\{/);

const light = extractPalette(lightBlock);
const dark = extractPalette(darkBlock);

type Pair = [fg: TokenName, bg: TokenName, threshold: number];

const PAIRS: Pair[] = [
  ["app-fg", "app-bg", 4.5],
  ["app-fg", "app-surface", 4.5],
  ["app-muted", "app-bg", 4.5],
  ["app-muted", "app-surface", 4.5],
  ["app-accent-fg", "app-accent", 4.5],
  ["app-error", "app-bg", 4.5],
  ["app-error", "app-surface", 4.5],
  ["app-border", "app-surface", 3],
  ["app-border", "app-bg", 3],
  ["app-accent", "app-bg", 3],
  ["app-accent", "app-surface", 3],
  ["editor-keyword", "app-surface", 4.5],
  ["editor-string", "app-surface", 4.5],
  ["editor-number", "app-surface", 4.5],
  ["editor-function", "app-surface", 4.5],
  ["editor-comment", "app-surface", 4.5],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme token contrast", (themeName, palette) => {
  it.each(PAIRS)("--%s on --%s meets its threshold", (fg, bg, threshold) => {
    const ratio = wcagContrast(palette[fg], palette[bg]);
    expect(
      ratio,
      `${themeName}: --${fg} on --${bg} is ${ratio.toFixed(2)}:1, needs ${threshold}:1`,
    ).toBeGreaterThanOrEqual(threshold);
  });
});

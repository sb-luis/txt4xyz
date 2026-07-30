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
//
// app-hairline is intentionally excluded: it's a purely decorative separator,
// not something a11y contrast rules apply to.

const TOKEN_NAMES = [
  "app-bg",
  "app-fg",
  "app-surface-bg",
  "app-surface-fg",
  "app-surface-secondary-bg",
  "app-surface-secondary-fg",
  "app-error",
  "app-button-bg",
  "app-button-bg-hover",
  "app-button-fg",
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
  ["app-surface-fg", "app-surface-bg", 4.5],
  ["app-surface-secondary-fg", "app-surface-secondary-bg", 4.5],
  ["app-error", "app-bg", 4.5],
  ["app-button-fg", "app-button-bg", 4.5],
  ["app-button-fg", "app-button-bg-hover", 4.5],
  ["editor-keyword", "app-bg", 4.5],
  ["editor-string", "app-bg", 4.5],
  ["editor-number", "app-bg", 4.5],
  ["editor-function", "app-bg", 4.5],
  ["editor-comment", "app-bg", 4.5],
  // Non-text UI boundaries (WCAG 1.4.11): buttons must be
  // visibly distinct from the page background, not just from their own text.
  ["app-button-bg", "app-bg", 3],
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

  // A button is the one interactive, clickable element among these three —
  // it should read as more prominent than either surface tone, not just
  // "different enough" from the background.
  it("app-button-bg stands out from app-bg more than either surface tone does", () => {
    const buttonRatio = wcagContrast(palette["app-button-bg"], palette["app-bg"]);
    const surfaceRatio = wcagContrast(palette["app-surface-bg"], palette["app-bg"]);
    const surfaceSecondaryRatio = wcagContrast(
      palette["app-surface-secondary-bg"],
      palette["app-bg"],
    );
    expect(buttonRatio, `${themeName}: button contrast should exceed surface contrast`).toBeGreaterThan(
      surfaceRatio,
    );
    expect(
      buttonRatio,
      `${themeName}: button contrast should exceed surface-secondary contrast`,
    ).toBeGreaterThan(surfaceSecondaryRatio);
  });
});

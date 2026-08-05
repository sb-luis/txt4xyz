import { describe, expect, it, vi } from "vitest";

// Ruff's own formatting correctness is Astral's concern, well covered
// upstream; what this module owns is the init/caching wiring and wrapping
// thrown errors as FormatError. The real wasm binary can't load here — its
// default init() fetches relative to import.meta.url, which resolves to a
// file:// URL that Node's fetch doesn't support — so the workspace is faked.
const format = vi.fn((code: string) => code.toUpperCase());
const workspaceCtor = vi.fn(function Workspace(this: { format: typeof format }) {
  this.format = format;
});
const init = vi.fn(async () => {});

vi.mock("@astral-sh/ruff-wasm-web", () => ({
  default: init,
  Workspace: Object.assign(workspaceCtor, { defaultSettings: () => ({}) }),
  PositionEncoding: { Utf16: 1 },
}));

const { FormatError, formatLangPy } = await import("./ruffFormatter");

describe("formatLangPy", () => {
  it("initializes the wasm module and workspace once, reusing them across calls", async () => {
    await formatLangPy("a");
    await formatLangPy("b");

    expect(init).toHaveBeenCalledTimes(1);
    expect(workspaceCtor).toHaveBeenCalledTimes(1);
  });

  it("wraps a thrown formatting error as FormatError", async () => {
    format.mockImplementationOnce(() => {
      throw new Error("SyntaxError: invalid syntax");
    });

    await expect(formatLangPy("def f(:")).rejects.toBeInstanceOf(FormatError);
  });
});

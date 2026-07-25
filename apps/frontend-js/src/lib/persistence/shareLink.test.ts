import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildShareUrl,
  decodeCodeFromFragment,
  encodeCodeToFragment,
  readCodeFromLocationHash,
} from "./shareLink";

describe("encodeCodeToFragment / decodeCodeFromFragment", () => {
  it("round-trips arbitrary code", () => {
    const code = "for i in range(5):\n    print(i)\n# emoji 🐍 and unicode ünïcödé\n";
    expect(decodeCodeFromFragment(encodeCodeToFragment(code))).toBe(code);
  });

  it("round-trips empty-ish and large code", () => {
    const code = "x = 1\n".repeat(2000);
    const fragment = encodeCodeToFragment(code);
    expect(decodeCodeFromFragment(fragment)).toBe(code);
  });

  it("returns null for an empty fragment", () => {
    expect(decodeCodeFromFragment("")).toBeNull();
  });

  it("returns null for garbage input instead of throwing", () => {
    expect(() => decodeCodeFromFragment("not-valid-lz-string-data!!!")).not.toThrow();
    expect(decodeCodeFromFragment("not-valid-lz-string-data!!!")).toBeNull();
  });

  it("returns null for a truncated fragment", () => {
    const fragment = encodeCodeToFragment("print('hello world')".repeat(10));
    const truncated = fragment.slice(0, Math.floor(fragment.length / 2));
    expect(decodeCodeFromFragment(truncated)).toBeNull();
  });

  it("rejects a decoded payload larger than the cap", () => {
    const huge = "a".repeat(200_000);
    const fragment = encodeCodeToFragment(huge);
    expect(decodeCodeFromFragment(fragment)).toBeNull();
  });
});

describe("buildShareUrl / readCodeFromLocationHash", () => {
  afterEach(() => {
    window.location.hash = "";
    vi.unstubAllGlobals();
  });

  it("builds a URL whose hash decodes back to the source code", () => {
    const code = "print('shared')";
    const shared = buildShareUrl(code);
    const hash = new URL(shared).hash.slice(1);
    expect(decodeCodeFromFragment(hash)).toBe(code);
  });

  it("reads code back from window.location.hash", () => {
    window.location.hash = encodeCodeToFragment("print('from hash')");
    expect(readCodeFromLocationHash()).toBe("print('from hash')");
  });

  it("returns null when there is no hash", () => {
    window.location.hash = "";
    expect(readCodeFromLocationHash()).toBeNull();
  });
});

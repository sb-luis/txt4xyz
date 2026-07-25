import { afterEach, describe, expect, it } from "vitest";
import { encodeCodeToFragment } from "./shareLink";
import { resolveInitialDoc } from "./resolveInitialDoc";

const STORAGE_KEY = "txt4xyz:doc";
const DEFAULT_DOC = "print('default')";

describe("resolveInitialDoc", () => {
  afterEach(() => {
    window.location.hash = "";
    window.localStorage.clear();
  });

  it("falls back to the default doc when nothing else is present", () => {
    expect(resolveInitialDoc(DEFAULT_DOC)).toBe(DEFAULT_DOC);
  });

  it("prefers localStorage over the default", () => {
    window.localStorage.setItem(STORAGE_KEY, "print('from storage')");
    expect(resolveInitialDoc(DEFAULT_DOC)).toBe("print('from storage')");
  });

  it("prefers the URL fragment over localStorage and the default", () => {
    window.localStorage.setItem(STORAGE_KEY, "print('from storage')");
    window.location.hash = encodeCodeToFragment("print('from link')");
    expect(resolveInitialDoc(DEFAULT_DOC)).toBe("print('from link')");
  });

  it("falls back past a garbage fragment to localStorage", () => {
    window.localStorage.setItem(STORAGE_KEY, "print('from storage')");
    window.location.hash = "garbage!!!";
    expect(resolveInitialDoc(DEFAULT_DOC)).toBe("print('from storage')");
  });
});

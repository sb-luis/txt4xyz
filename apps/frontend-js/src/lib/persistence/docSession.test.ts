import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeCodeToFragment } from "./shareLink";
import { ROOT_DOC_KEY, createDebouncedDocWriter } from "./localStore";
import { resolveDocSession } from "./docSession";

const DEFAULT_DOC = "print('default')";

function openSharedLink(code: string) {
  window.location.hash = encodeCodeToFragment(code);
}

function saveVia(key: string, doc: string) {
  const writer = createDebouncedDocWriter(key, 0);
  writer.schedule(doc);
  vi.advanceTimersByTime(1);
}

describe("resolveDocSession", () => {
  afterEach(() => {
    window.location.hash = "";
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("leaves the URL untouched, so a shared link stays copyable and refreshable", () => {
    openSharedLink("print('from link')");
    const before = window.location.href;

    resolveDocSession(DEFAULT_DOC);

    expect(window.location.href).toBe(before);
  });

  it("never overwrites the recipient's own scratchpad", () => {
    window.localStorage.setItem(ROOT_DOC_KEY, "print('my scratchpad')");
    openSharedLink("print('from link')");

    vi.useFakeTimers();
    const session = resolveDocSession(DEFAULT_DOC);
    saveVia(session.key, "print('from link') # edited");

    expect(window.localStorage.getItem(ROOT_DOC_KEY)).toBe("print('my scratchpad')");
  });

  it("returns edits to a shared link on a later load, not the sender's original", () => {
    openSharedLink("print('from link')");

    vi.useFakeTimers();
    const first = resolveDocSession(DEFAULT_DOC);
    expect(first.doc).toBe("print('from link')");
    saveVia(first.key, "print('from link') # edited");

    expect(resolveDocSession(DEFAULT_DOC).doc).toBe("print('from link') # edited");
  });

  it("uses the root key and stored doc when there is no fragment", () => {
    window.localStorage.setItem(ROOT_DOC_KEY, "print('my scratchpad')");

    const session = resolveDocSession(DEFAULT_DOC);

    expect(session.key).toBe(ROOT_DOC_KEY);
    expect(session.doc).toBe("print('my scratchpad')");
  });

  it("falls back to the default when nothing is stored and there is no fragment", () => {
    expect(resolveDocSession(DEFAULT_DOC).doc).toBe(DEFAULT_DOC);
  });

  it("falls back past a garbage fragment to the root scratchpad", () => {
    window.localStorage.setItem(ROOT_DOC_KEY, "print('my scratchpad')");
    window.location.hash = "garbage!!!";

    const session = resolveDocSession(DEFAULT_DOC);

    expect(session.key).toBe(ROOT_DOC_KEY);
    expect(session.doc).toBe("print('my scratchpad')");
  });

  it("does not mistake a room fragment for a compressed code share", () => {
    // This specific room id happens to decompress to a non-empty garbage string
    // via lz-string's decoder — proof the collision is real, not hypothetical.
    window.localStorage.setItem(ROOT_DOC_KEY, "print('my scratchpad')");
    window.location.hash = "room=bqsrkAkjylvIxRtSBuieVw";

    const session = resolveDocSession(DEFAULT_DOC);

    expect(session.key).toBe(ROOT_DOC_KEY);
    expect(session.doc).toBe("print('my scratchpad')");
  });

  it("gives two different links two different keys", () => {
    openSharedLink("print('link one')");
    const one = resolveDocSession(DEFAULT_DOC).key;
    openSharedLink("print('link two')");
    const two = resolveDocSession(DEFAULT_DOC).key;

    expect(one).not.toBe(two);
    expect(one).not.toBe(ROOT_DOC_KEY);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalDocStore } from "./localDocStore";

describe("createLocalDocStore", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null when nothing is stored for the room", () => {
    const store = createLocalDocStore();
    expect(store.read("room-a")).toBeNull();
  });

  it("round-trips a document under its room-scoped key", () => {
    const store = createLocalDocStore();
    store.write("room-a", "print('a')");
    expect(store.read("room-a")).toBe("print('a')");
    expect(window.localStorage.getItem("txt4xyz:room:room-a")).toBe("print('a')");
  });

  it("keeps two rooms' documents from colliding", () => {
    const store = createLocalDocStore();
    store.write("room-a", "print('a')");
    store.write("room-b", "print('b')");

    expect(store.read("room-a")).toBe("print('a')");
    expect(store.read("room-b")).toBe("print('b')");
  });

  it("prunes the least-recently-touched room once the bound is exceeded, deleting its key", () => {
    const store = createLocalDocStore();
    for (let i = 0; i < 21; i++) {
      store.write(`room-${i}`, `print(${i})`);
    }

    // room-0 is the least-recently-touched of 21 rooms against a bound of 20.
    expect(store.read("room-0")).toBeNull();
    expect(window.localStorage.getItem("txt4xyz:room:room-0")).toBeNull();
    expect(store.read("room-20")).toBe("print(20)");
  });

  it("keeps a room's slot fresh (not evicted) when it is written again", () => {
    const store = createLocalDocStore();
    store.write("room-old", "print('old')");
    for (let i = 0; i < 19; i++) {
      store.write(`room-${i}`, `print(${i})`);
    }
    // Touch room-old again so it is no longer the least-recently-used entry.
    store.write("room-old", "print('old, edited')");
    store.write("room-new", "print('new')");

    expect(store.read("room-old")).toBe("print('old, edited')");
    expect(store.read("room-0")).toBeNull();
  });

  it("tracks most-recently-touched order in the index", () => {
    const store = createLocalDocStore();
    store.write("room-a", "a");
    store.write("room-b", "b");
    store.write("room-a", "a-edited");

    const index = JSON.parse(window.localStorage.getItem("txt4xyz:room-index") ?? "[]") as string[];
    expect(index).toEqual(["room-a", "room-b"]);
  });

  it("does not throw when the underlying localStorage throws", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const store = createLocalDocStore();
    expect(() => store.write("room-a", "x")).not.toThrow();
    expect(() => store.read("room-a")).not.toThrow();
    expect(store.read("room-a")).toBeNull();
  });

  it("respects custom prefix, indexKey, and maxDocs options", () => {
    const store = createLocalDocStore({ prefix: "custom:", indexKey: "custom-index", maxDocs: 1 });
    store.write("room-a", "a");
    store.write("room-b", "b");

    expect(window.localStorage.getItem("custom:room-a")).toBeNull();
    expect(window.localStorage.getItem("custom:room-b")).toBe("b");
    expect(window.localStorage.getItem("custom-index")).toBe(JSON.stringify(["room-b"]));
  });
});

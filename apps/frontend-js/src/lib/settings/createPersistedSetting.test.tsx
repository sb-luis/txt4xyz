import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { renderHook, render, screen } from "@testing-library/react";
import { z } from "zod";
import { createPersistedSetting } from "./createPersistedSetting";

const KEY = "txt4xyz:test-setting";

afterEach(() => {
  window.localStorage.clear();
});

describe("createPersistedSetting", () => {
  it("uses the default value when nothing is stored", () => {
    const setting = createPersistedSetting({
      key: KEY,
      schema: z.string(),
      defaultValue: "fallback",
    });

    const { result } = renderHook(() => setting.use(), { wrapper: setting.Provider });

    expect(result.current.value).toBe("fallback");
  });

  it("uses the default value when the stored value is corrupt JSON", () => {
    window.localStorage.setItem(KEY, "{not valid json");
    const setting = createPersistedSetting({
      key: KEY,
      schema: z.object({ n: z.number() }),
      defaultValue: { n: 0 },
    });

    const { result } = renderHook(() => setting.use(), { wrapper: setting.Provider });

    expect(result.current.value).toEqual({ n: 0 });
  });

  it("uses the default value when the stored value fails the schema", () => {
    window.localStorage.setItem(KEY, JSON.stringify("blue"));
    const setting = createPersistedSetting({
      key: KEY,
      schema: z.union([z.literal("light"), z.literal("dark")]),
      defaultValue: "light" as const,
    });

    const { result } = renderHook(() => setting.use(), { wrapper: setting.Provider });

    expect(result.current.value).toBe("light");
  });

  it("round-trips a value through setValue and localStorage", () => {
    const setting = createPersistedSetting({
      key: KEY,
      schema: z.union([z.literal("light"), z.literal("dark")]),
      defaultValue: "light" as const,
    });

    const { result } = renderHook(() => setting.use(), { wrapper: setting.Provider });

    act(() => {
      const ok = result.current.setValue("dark");
      expect(ok).toBe(true);
    });

    expect(result.current.value).toBe("dark");
    expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify("dark"));
  });

  it("returns false from setValue and leaves state unchanged when the schema rejects the value", () => {
    const MAX_LENGTH = 24;
    const aliasSchema = z
      .string()
      .refine((v) => v.length > 0 && v.length <= MAX_LENGTH && /^[a-zA-Z0-9-]+$/.test(v));
    const setting = createPersistedSetting({
      key: KEY,
      schema: aliasSchema,
      defaultValue: "",
    });

    const { result } = renderHook(() => setting.use(), { wrapper: setting.Provider });

    act(() => {
      const ok = result.current.setValue("valid-alias");
      expect(ok).toBe(true);
    });
    expect(result.current.value).toBe("valid-alias");

    act(() => {
      const ok = result.current.setValue("has spaces");
      expect(ok).toBe(false);
    });

    expect(result.current.value).toBe("valid-alias");
    expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify("valid-alias"));
  });

  it("throws when use() is called outside its Provider", () => {
    const setting = createPersistedSetting({
      key: KEY,
      schema: z.string(),
      defaultValue: "x",
    });

    function Consumer() {
      setting.use();
      return null;
    }

    expect(() => render(<Consumer />)).toThrow(/must be used within its Provider/);
  });

  it("reads a legacy bare-string value (pre-dating JSON encoding) under the same key", () => {
    window.localStorage.setItem(KEY, "dark");
    const setting = createPersistedSetting({
      key: KEY,
      schema: z.union([z.literal("light"), z.literal("dark")]),
      defaultValue: "light" as const,
    });

    const { result } = renderHook(() => setting.use(), { wrapper: setting.Provider });

    expect(result.current.value).toBe("dark");
  });

  it("renders children through the Provider", () => {
    const setting = createPersistedSetting({
      key: KEY,
      schema: z.string(),
      defaultValue: "x",
    });

    render(
      <setting.Provider>
        <div>child content</div>
      </setting.Provider>,
    );

    expect(screen.getByText("child content")).not.toBeNull();
  });
});

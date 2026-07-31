import { describe, expect, it } from "vitest";
import {
  parseMainToWorkerMessage,
  parseWorkerToMainMessage,
} from "./protocol";

describe("parseMainToWorkerMessage", () => {
  it("accepts a valid run request", () => {
    const message = parseMainToWorkerMessage({
      type: "run",
      id: "abc",
      code: "print(1)",
    });
    expect(message).toEqual({ type: "run", id: "abc", code: "print(1)" });
  });

  it("rejects a message missing code", () => {
    expect(() =>
      parseMainToWorkerMessage({ type: "run", id: "abc" }),
    ).toThrow();
  });

  it("rejects an unknown message type", () => {
    expect(() =>
      parseMainToWorkerMessage({ type: "stop", id: "abc" }),
    ).toThrow();
  });

  it("rejects non-object input", () => {
    expect(() => parseMainToWorkerMessage("not a message")).toThrow();
  });
});

describe("parseWorkerToMainMessage", () => {
  it("accepts a ready message", () => {
    expect(parseWorkerToMainMessage({ type: "ready" })).toEqual({
      type: "ready",
    });
  });

  it("accepts a stdout message", () => {
    const message = parseWorkerToMainMessage({
      type: "stdout",
      id: "run-1",
      line: "hello",
    });
    expect(message).toEqual({ type: "stdout", id: "run-1", line: "hello" });
  });

  it("accepts a run-error message with a traceback", () => {
    const message = parseWorkerToMainMessage({
      type: "run-error",
      id: "run-1",
      traceback: "Traceback...",
    });
    expect(message).toEqual({
      type: "run-error",
      id: "run-1",
      traceback: "Traceback...",
    });
  });

  it("rejects a malformed message", () => {
    expect(() =>
      parseWorkerToMainMessage({ type: "stdout", id: "run-1" }),
    ).toThrow();
  });

  it("rejects a message with an unrecognized type", () => {
    expect(() =>
      parseWorkerToMainMessage({ type: "bogus" }),
    ).toThrow();
  });

  it("accepts a dataframe display message", () => {
    const message = parseWorkerToMainMessage({
      type: "display",
      id: "run-1",
      display: {
        kind: "dataframe",
        handle: "h1",
        columns: ["a", "b"],
        rows: [["1", "2"]],
        rowCount: 1,
        truncated: false,
      },
    });
    expect(message).toEqual({
      type: "display",
      id: "run-1",
      display: {
        kind: "dataframe",
        handle: "h1",
        columns: ["a", "b"],
        rows: [["1", "2"]],
        rowCount: 1,
        truncated: false,
      },
    });
  });

  it("accepts a plot display message", () => {
    const message = parseWorkerToMainMessage({
      type: "display",
      id: "run-1",
      display: { kind: "plot", svg: "<svg></svg>" },
    });
    expect(message).toEqual({
      type: "display",
      id: "run-1",
      display: { kind: "plot", svg: "<svg></svg>" },
    });
  });

  it("accepts an html display message", () => {
    const message = parseWorkerToMainMessage({
      type: "display",
      id: "run-1",
      display: { kind: "html", html: "<h1>hi</h1>" },
    });
    expect(message).toEqual({
      type: "display",
      id: "run-1",
      display: { kind: "html", html: "<h1>hi</h1>" },
    });
  });

  it("accepts an image display message", () => {
    const message = parseWorkerToMainMessage({
      type: "display",
      id: "run-1",
      display: { kind: "image", mime: "image/png", dataBase64: "AAAA" },
    });
    expect(message).toEqual({
      type: "display",
      id: "run-1",
      display: { kind: "image", mime: "image/png", dataBase64: "AAAA" },
    });
  });

  it("accepts a json display message", () => {
    const message = parseWorkerToMainMessage({
      type: "display",
      id: "run-1",
      display: { kind: "json", value: { a: 1 } },
    });
    expect(message).toEqual({
      type: "display",
      id: "run-1",
      display: { kind: "json", value: { a: 1 } },
    });
  });

  it("rejects a display message with an unrecognized display kind", () => {
    expect(() =>
      parseWorkerToMainMessage({
        type: "display",
        id: "run-1",
        display: { kind: "bogus" },
      }),
    ).toThrow();
  });
});

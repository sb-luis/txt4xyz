import { beforeAll, describe, expect, it, vi } from "vitest";
import { loadPyodide, type PyodideInterface } from "pyodide";
// Real Pyodide, loaded from the local package so the test runs offline and
// fast. This exercises the actual runPythonAsync/globals behaviour rather
// than a mock, since the bug this guards against lives in that interaction.
// Resolved relative to this file, not the process cwd, so the suite passes
// regardless of which directory vitest is invoked from. `node:url`/`node:path`
// aren't available in this browser-targeted tsconfig, so strip the `file://`
// prefix by hand instead of pulling in @types/node.
const thisFilePath = import.meta.url.replace(/^file:\/\//, "");
const thisDir = thisFilePath.slice(0, thisFilePath.lastIndexOf("/"));
const localIndexURL = `${thisDir}/../../../node_modules/pyodide/`;

let run: typeof import("./runner.worker").run;
let pyodide: PyodideInterface;

beforeAll(async () => {
  // The worker module posts messages via `self.postMessage` and kicks off
  // its own Pyodide load at import time; stub both so importing it in a
  // plain node/jsdom test context is inert. The test drives `run` directly
  // against its own Pyodide instance instead.
  vi.stubGlobal("postMessage", vi.fn());
  vi.stubEnv("VITE_PYODIDE_INDEX_URL", localIndexURL);

  const mod = await import("./runner.worker");
  run = mod.run;
  pyodide = await loadPyodide({ indexURL: localIndexURL });
}, 60_000);

// Each run executes in a fresh module installed as `__main__`. These three
// tests pin the properties that choice buys: isolation between runs, and a
// `__main__` that is genuinely the module user code runs in rather than one
// that merely claims the name.
describe("run", () => {
  it("starts each run from an empty namespace", async () => {
    const postMessage = self.postMessage as unknown as ReturnType<typeof vi.fn>;

    await run(pyodide, "1", "x = 10");
    const firstResult = postMessage.mock.calls.at(-1)?.[0];
    expect(firstResult).toEqual({ type: "run-result", id: "1" });

    await run(pyodide, "2", "print(x)");
    const secondResult = postMessage.mock.calls.at(-1)?.[0] as {
      type: string;
      id: string;
      traceback: string;
    };

    expect(secondResult.type).toBe("run-error");
    expect(secondResult.traceback).toContain("NameError");
  }, 20_000);

  // A wrong __name__ does not raise: lookup falls back to __builtins__ and
  // resolves to "builtins", so a main-guard would silently skip its body
  // rather than error. Assert the value itself so the failure is loud.
  it("runs user code under the name __main__, so main-guarded blocks execute", async () => {
    const postMessage = self.postMessage as unknown as ReturnType<typeof vi.fn>;
    postMessage.mockClear();

    await run(
      pyodide,
      "3",
      [
        "if __name__ != '__main__':",
        "    raise RuntimeError('unexpected __name__: ' + repr(__name__))",
      ].join("\n"),
    );

    expect(postMessage.mock.calls.at(-1)?.[0]).toEqual({
      type: "run-result",
      id: "3",
    });
  }, 20_000);

  // Classes defined by user code record __module__ = "__main__" and are looked
  // up again via sys.modules["__main__"]. If the namespace we execute in is not
  // that module, the class advertises an address it does not live at. Pickle is
  // the cheapest way to make that mismatch fail visibly — the point is the
  // lookup, not pickling itself.
  it("defines user classes in the real __main__, so they can be looked up again", async () => {
    const postMessage = self.postMessage as unknown as ReturnType<typeof vi.fn>;
    postMessage.mockClear();

    await run(
      pyodide,
      "4",
      [
        "import pickle",
        "class Z:",
        "    pass",
        "assert pickle.loads(pickle.dumps(Z)) is Z",
      ].join("\n"),
    );

    expect(postMessage.mock.calls.at(-1)?.[0]).toEqual({
      type: "run-result",
      id: "4",
    });
  }, 20_000);

  it("falls back to print(repr(obj)) instead of emitting a display message when pandas isn't imported", async () => {
    const postMessage = self.postMessage as unknown as ReturnType<typeof vi.fn>;
    postMessage.mockClear();

    await run(pyodide, "5", "display(42)");
    const calls = postMessage.mock.calls.map((call) => call[0]);

    expect(calls).toContainEqual({ type: "run-result", id: "5" });
    expect(calls.some((call) => (call as { type: string }).type === "display")).toBe(false);
  }, 20_000);

  it("emits a display message with camelCase fields via the JSON display bridge", async () => {
    const postMessage = self.postMessage as unknown as ReturnType<typeof vi.fn>;
    postMessage.mockClear();

    await run(
      pyodide,
      "6",
      [
        "import json",
        "_emit_display(json.dumps({",
        "    'kind': 'dataframe',",
        "    'columns': ['a'],",
        "    'rows': [['1']],",
        "    'row_count': 600,",
        "    'truncated': True,",
        "}))",
      ].join("\n"),
    );

    const calls = postMessage.mock.calls.map((call) => call[0]);
    expect(calls).toContainEqual({
      type: "display",
      id: "6",
      display: {
        kind: "dataframe",
        columns: ["a"],
        rows: [["1"]],
        rowCount: 600,
        truncated: true,
      },
    });
  }, 20_000);

  it("does not attempt matplotlib capture when matplotlib was never imported", async () => {
    const postMessage = self.postMessage as unknown as ReturnType<typeof vi.fn>;
    postMessage.mockClear();

    await run(pyodide, "7", "x = 1");
    const calls = postMessage.mock.calls.map((call) => call[0]);
    expect(calls).toEqual([{ type: "run-result", id: "7" }]);
  }, 20_000);
});

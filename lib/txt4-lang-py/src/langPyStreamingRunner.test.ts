import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { createLangPyStreamingRunner } from "./langPyStreamingRunner";
import type { WorkerToMainMessage } from "./protocol";

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(data: unknown) {
    this.posted.push(data);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: WorkerToMainMessage) {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }

  static latest(): FakeWorker {
    const worker = FakeWorker.instances.at(-1);
    if (!worker) throw new Error("no worker instance");
    return worker;
  }
}

function postedRunId(worker: FakeWorker, index = 0): string {
  const posted = worker.posted.filter((m) => (m as { type: string }).type === "run");
  return (posted[index] as { id: string }).id;
}

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createLangPyStreamingRunner", () => {
  it("does not spawn a worker until run() is called", () => {
    createLangPyStreamingRunner();
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("streams stdout entries through onOutput as they arrive, in order", async () => {
    const runner = createLangPyStreamingRunner();
    const outputs: unknown[] = [];
    const promise = runner.run("print(1)\nprint(2)", (entry) => outputs.push(entry));

    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    const id = postedRunId(worker);

    worker.emit({ type: "stdout", id, line: "1" });
    worker.emit({ type: "stdout", id, line: "2" });
    worker.emit({ type: "run-result", id });

    const outcome = await promise;
    expect(outcome).toEqual({ error: null });
    expect(outputs).toEqual([
      { kind: "stdout", line: "1" },
      { kind: "stdout", line: "2" },
    ]);
  });

  it("resolves on run-result", async () => {
    const runner = createLangPyStreamingRunner();
    const promise = runner.run("print(1)", () => {});

    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    const id = postedRunId(worker);

    worker.emit({ type: "run-result", id });

    await expect(promise).resolves.toEqual({ error: null });
  });

  it("resolves instead of rejecting on run-error, reporting the failure in both channels", async () => {
    const runner = createLangPyStreamingRunner();
    const outputs: unknown[] = [];
    const promise = runner.run("raise ValueError('boom')", (entry) => outputs.push(entry));

    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    const id = postedRunId(worker);

    worker.emit({ type: "run-error", id, traceback: "ValueError: boom" });

    const outcome = await promise;
    expect(outcome).toEqual({ error: "ValueError: boom" });
    expect(outputs).toEqual([{ kind: "traceback", text: "ValueError: boom" }]);
  });

  it("serializes overlapping run() calls instead of interleaving them", async () => {
    const runner = createLangPyStreamingRunner();

    const first = runner.run("print(1)", () => {});
    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();

    const second = runner.run("print(2)", () => {});

    const runPosted = () => worker.posted.filter((m) => (m as { type: string }).type === "run");
    expect(runPosted()).toHaveLength(1);

    const firstId = postedRunId(worker, 0);
    worker.emit({ type: "run-result", id: firstId });

    const firstOutcome = await first;
    expect(firstOutcome).toEqual({ error: null });

    await Promise.resolve();
    await Promise.resolve();
    expect(runPosted()).toHaveLength(2);

    const secondId = postedRunId(worker, 1);
    expect(secondId).not.toBe(firstId);
    worker.emit({ type: "run-result", id: secondId });

    const secondOutcome = await second;
    expect(secondOutcome).toEqual({ error: null });
  });

  it("dispose() is safe to call before any run", () => {
    const runner = createLangPyStreamingRunner();
    expect(() => runner.dispose()).not.toThrow();
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("settles with an error instead of hanging when the worker fails to init", async () => {
    const runner = createLangPyStreamingRunner();
    const promise = runner.run("print(1)", () => {});

    const worker = FakeWorker.latest();
    worker.emit({ type: "init-failure", message: "wasm rejected" });

    const outcome = await promise;
    expect(outcome.error).toEqual(expect.any(String));
    expect(outcome.error).not.toBe("");
  });

  it("dispose() terminates the underlying client after a run", async () => {
    const runner = createLangPyStreamingRunner();
    const promise = runner.run("print(1)", () => {});

    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    const id = postedRunId(worker);
    worker.emit({ type: "run-result", id });
    await promise;

    runner.dispose();
    expect(worker.terminated).toBe(true);
  });
});

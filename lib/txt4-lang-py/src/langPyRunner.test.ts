import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { createLangPyRunner } from "./langPyRunner";
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

function postedRunTracedId(worker: FakeWorker, index = 0): string {
  const posted = worker.posted.filter((m) => (m as { type: string }).type === "run-traced");
  return (posted[index] as { id: string }).id;
}

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createLangPyRunner", () => {
  it("does not spawn a worker until run() is called", () => {
    createLangPyRunner();
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("maps a timeline to playback steps on a successful run", async () => {
    const runner = createLangPyRunner();
    const promise = runner.run("print(1)");

    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    const id = postedRunTracedId(worker);

    worker.emit({
      type: "run-timeline",
      id,
      steps: [{ line: 1, stdout: ["1"], stderr: [], display: [] }],
    });
    worker.emit({ type: "run-result", id });

    const outcome = await promise;
    expect(outcome).toEqual({
      steps: [{ line: 1, outputs: [{ kind: "stdout", line: "1" }] }],
      error: null,
    });
  });

  it("surfaces a traced error in the outcome", async () => {
    const runner = createLangPyRunner();
    const promise = runner.run("raise ValueError('boom')");

    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    const id = postedRunTracedId(worker);

    worker.emit({ type: "run-timeline", id, steps: [] });
    worker.emit({ type: "run-error", id, traceback: "ValueError: boom" });

    const outcome = await promise;
    expect(outcome).toEqual({ steps: [], error: "ValueError: boom" });
  });

  it("serializes overlapping run() calls instead of interleaving them", async () => {
    const runner = createLangPyRunner();

    const first = runner.run("print(1)");
    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();

    const second = runner.run("print(2)");

    // Only the first run-traced request should have been posted so far --
    // the second must wait for the first to settle.
    const runTracedPosted = () =>
      worker.posted.filter((m) => (m as { type: string }).type === "run-traced");
    expect(runTracedPosted()).toHaveLength(1);

    const firstId = postedRunTracedId(worker, 0);
    worker.emit({ type: "run-timeline", id: firstId, steps: [] });
    worker.emit({ type: "run-result", id: firstId });

    const firstOutcome = await first;
    expect(firstOutcome).toEqual({ steps: [], error: null });

    // Now that the first has settled, the second should have been posted.
    await Promise.resolve();
    await Promise.resolve();
    expect(runTracedPosted()).toHaveLength(2);

    const secondId = postedRunTracedId(worker, 1);
    expect(secondId).not.toBe(firstId);
    worker.emit({ type: "run-timeline", id: secondId, steps: [] });
    worker.emit({ type: "run-result", id: secondId });

    const secondOutcome = await second;
    expect(secondOutcome).toEqual({ steps: [], error: null });
  });

  it("dispose() is safe to call before any run", () => {
    const runner = createLangPyRunner();
    expect(() => runner.dispose()).not.toThrow();
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("settles with an error instead of hanging when the worker fails to init", async () => {
    const runner = createLangPyRunner();
    const promise = runner.run("print(1)");

    const worker = FakeWorker.latest();
    worker.emit({ type: "init-failure", message: "wasm rejected" });

    const outcome = await promise;
    expect(outcome.steps).toEqual([]);
    expect(outcome.error).toEqual(expect.any(String));
    expect(outcome.error).not.toBe("");
  });

  it("settles a subsequent run() with an error after init has already failed, instead of hanging", async () => {
    const runner = createLangPyRunner();
    const first = runner.run("print(1)");
    const worker = FakeWorker.latest();
    worker.emit({ type: "init-failure", message: "wasm rejected" });
    await first;

    const second = runner.run("print(2)");
    const outcome = await second;
    expect(outcome).toEqual({ steps: [], error: expect.any(String) });
  });

  it("dispose() terminates the underlying client after a run", async () => {
    const runner = createLangPyRunner();
    const promise = runner.run("print(1)");

    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    const id = postedRunTracedId(worker);
    worker.emit({ type: "run-timeline", id, steps: [] });
    worker.emit({ type: "run-result", id });
    await promise;

    runner.dispose();
    expect(worker.terminated).toBe(true);
  });
});

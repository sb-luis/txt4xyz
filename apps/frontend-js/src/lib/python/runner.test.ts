import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PythonRunnerClient, type OutputEntry, type RunnerStatus } from "./runner";
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

function makeClient() {
  const statuses: RunnerStatus[] = [];
  const output: OutputEntry[] = [];
  const client = new PythonRunnerClient({
    onStatusChange: (status) => statuses.push(status),
    onOutput: (entry) => output.push(entry),
  });
  return { client, statuses, output };
}

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PythonRunnerClient", () => {
  it("spawns a worker on construction and reports loading", () => {
    const { statuses } = makeClient();
    expect(statuses).toEqual(["loading"]);
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it("transitions to ready on a ready message", () => {
    const { statuses } = makeClient();
    FakeWorker.latest().emit({ type: "ready" });
    expect(statuses).toEqual(["loading", "ready"]);
  });

  it("transitions to running on run, then back to ready on run-result", () => {
    const { client, statuses, output } = makeClient();
    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });

    client.run("print(1)");
    expect(statuses.at(-1)).toBe("running");

    const posted = worker.posted[0] as { type: string; id: string; code: string };
    expect(posted.type).toBe("run");
    expect(posted.code).toBe("print(1)");

    worker.emit({ type: "stdout", id: posted.id, line: "1" });
    expect(output).toEqual([{ kind: "stdout", line: "1" }]);

    worker.emit({ type: "run-result", id: posted.id });
    expect(statuses.at(-1)).toBe("ready");
  });

  it("emits a traceback entry on run-error and returns to ready", () => {
    const { client, statuses, output } = makeClient();
    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });

    client.run("1/0");
    const posted = worker.posted[0] as { id: string };
    worker.emit({ type: "run-error", id: posted.id, traceback: "ZeroDivisionError" });

    expect(output).toEqual([{ kind: "traceback", text: "ZeroDivisionError" }]);
    expect(statuses.at(-1)).toBe("ready");
  });

  it("moves to error status on init-failure", () => {
    const { statuses } = makeClient();
    FakeWorker.latest().emit({ type: "init-failure", message: "boom" });
    expect(statuses.at(-1)).toBe("error");
  });

  it("discards stdout/stderr/result carrying a stale run id", () => {
    const { client, statuses, output } = makeClient();
    const worker = FakeWorker.latest();
    worker.emit({ type: "ready" });

    client.run("print(1)");
    const firstId = (worker.posted[0] as { id: string }).id;

    worker.emit({ type: "run-result", id: firstId });
    expect(statuses.at(-1)).toBe("ready");

    client.run("print(2)");
    const secondId = (worker.posted[1] as { id: string }).id;
    expect(secondId).not.toBe(firstId);

    worker.emit({ type: "stdout", id: firstId, line: "stale" });
    expect(output).toEqual([]);

    worker.emit({ type: "run-result", id: firstId });
    expect(statuses.at(-1)).toBe("running");

    worker.emit({ type: "stdout", id: secondId, line: "fresh" });
    expect(output).toEqual([{ kind: "stdout", line: "fresh" }]);
  });

  it("ignores a malformed message from the worker instead of throwing", () => {
    const { statuses } = makeClient();
    const worker = FakeWorker.latest();
    expect(() => worker.emit({ type: "stdout" } as unknown as WorkerToMainMessage)).not.toThrow();
    expect(statuses).toEqual(["loading"]);
  });

  it("stop() terminates the worker and spawns a fresh one, discarding old output", () => {
    const { client, statuses, output } = makeClient();
    const oldWorker = FakeWorker.latest();
    oldWorker.emit({ type: "ready" });

    client.run("while True: pass");
    const runId = (oldWorker.posted[0] as { id: string }).id;

    client.stop();
    expect(oldWorker.terminated).toBe(true);
    expect(FakeWorker.instances).toHaveLength(2);
    expect(statuses.at(-1)).toBe("loading");

    oldWorker.emit({ type: "stdout", id: runId, line: "late output" });
    expect(output).toEqual([]);

    const newWorker = FakeWorker.latest();
    newWorker.emit({ type: "ready" });
    expect(statuses.at(-1)).toBe("ready");
  });

  it("dispose() terminates the worker and stops reacting to messages", () => {
    const { client, statuses } = makeClient();
    const worker = FakeWorker.latest();
    client.dispose();
    expect(worker.terminated).toBe(true);

    worker.emit({ type: "ready" });
    expect(statuses).toEqual(["loading"]);
  });
});

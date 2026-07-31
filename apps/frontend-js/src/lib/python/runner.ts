import { parseWorkerToMainMessage } from "./protocol";

export type RunnerStatus = "loading" | "ready" | "running" | "error";

export type OutputEntry =
  | { kind: "stdout"; line: string }
  | { kind: "stderr"; line: string }
  | { kind: "traceback"; text: string }
  | { kind: "dataframe"; columns: string[]; rows: string[][]; rowCount: number; truncated: boolean }
  | { kind: "plot"; svg: string }
  | { kind: "html"; html: string }
  | { kind: "image"; mime: string; dataBase64: string }
  | { kind: "json"; value: unknown };

export interface PythonRunnerCallbacks {
  onStatusChange: (status: RunnerStatus) => void;
  onOutput: (entry: OutputEntry) => void;
}

function spawnWorker(): Worker {
  return new Worker(new URL("./runner.worker.ts", import.meta.url), {
    type: "module",
  });
}

export class PythonRunnerClient {
  private worker: Worker | null = null;
  private currentRunId: string | null = null;
  private callbacks: PythonRunnerCallbacks;

  constructor(callbacks: PythonRunnerCallbacks) {
    this.callbacks = callbacks;
    this.spawn();
  }

  private spawn() {
    this.callbacks.onStatusChange("loading");
    const worker = spawnWorker();
    worker.onmessage = (event: MessageEvent<unknown>) => {
      this.handleMessage(worker, event.data);
    };
    this.worker = worker;
  }

  private handleMessage(sourceWorker: Worker, data: unknown) {
    if (sourceWorker !== this.worker) return;

    let message;
    try {
      message = parseWorkerToMainMessage(data);
    } catch {
      return;
    }

    switch (message.type) {
      case "ready":
        this.callbacks.onStatusChange("ready");
        return;
      case "init-failure":
        this.callbacks.onStatusChange("error");
        return;
      case "stdout":
        if (message.id !== this.currentRunId) return;
        this.callbacks.onOutput({ kind: "stdout", line: message.line });
        return;
      case "stderr":
        if (message.id !== this.currentRunId) return;
        this.callbacks.onOutput({ kind: "stderr", line: message.line });
        return;
      case "display": {
        if (message.id !== this.currentRunId) return;
        const display = message.display;
        switch (display.kind) {
          case "dataframe":
            this.callbacks.onOutput({
              kind: "dataframe",
              columns: display.columns,
              rows: display.rows,
              rowCount: display.rowCount,
              truncated: display.truncated,
            });
            break;
          case "plot":
            this.callbacks.onOutput({ kind: "plot", svg: display.svg });
            break;
          case "html":
            this.callbacks.onOutput({ kind: "html", html: display.html });
            break;
          case "image":
            this.callbacks.onOutput({ kind: "image", mime: display.mime, dataBase64: display.dataBase64 });
            break;
          case "json":
            this.callbacks.onOutput({ kind: "json", value: display.value });
            break;
        }
        return;
      }
      case "run-result":
        if (message.id !== this.currentRunId) return;
        this.currentRunId = null;
        this.callbacks.onStatusChange("ready");
        return;
      case "run-error":
        if (message.id !== this.currentRunId) return;
        this.currentRunId = null;
        this.callbacks.onOutput({ kind: "traceback", text: message.traceback });
        this.callbacks.onStatusChange("ready");
        return;
    }
  }

  run(code: string) {
    if (!this.worker) return;
    const id = crypto.randomUUID();
    this.currentRunId = id;
    this.callbacks.onStatusChange("running");
    this.worker.postMessage({ type: "run", id, code });
  }

  stop() {
    this.worker?.terminate();
    this.currentRunId = null;
    this.spawn();
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
  }
}

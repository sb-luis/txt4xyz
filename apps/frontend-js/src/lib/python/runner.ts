import { parseWorkerToMainMessage, type DataframeSort } from "./protocol";

export type RunnerStatus = "loading" | "ready" | "running" | "error";

export type OutputEntry =
  | { kind: "stdout"; line: string }
  | { kind: "stderr"; line: string }
  | { kind: "traceback"; text: string }
  | { kind: "internal-error"; message: string }
  | {
      kind: "dataframe";
      handle: string;
      columns: string[];
      rows: (string | null)[][];
      rowCount: number;
      truncated: boolean;
    }
  | { kind: "plot"; svg: string }
  | { kind: "html"; html: string }
  | { kind: "image"; mime: string; dataBase64: string }
  | { kind: "json"; value: unknown };

export interface DataframePage {
  rows: (string | null)[][];
  rowCount: number;
}

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
  private pendingPageRequests = new Map<
    string,
    { resolve: (page: DataframePage) => void; reject: (err: Error) => void }
  >();

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
    } catch (err) {
      // A malformed worker message means a display payload violated its schema
      // (e.g. an unexpected type from Python) -- surface it instead of dropping
      // the message silently, or the output pane just stays blank.
      this.callbacks.onOutput({
        kind: "internal-error",
        message: `received malformed message from worker: ${String(err)}`,
      });
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
              handle: display.handle,
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
      case "dataframe-page-result": {
        const pending = this.pendingPageRequests.get(message.id);
        if (!pending) return;
        this.pendingPageRequests.delete(message.id);
        pending.resolve({ rows: message.rows, rowCount: message.rowCount });
        return;
      }
      case "dataframe-page-error": {
        const pending = this.pendingPageRequests.get(message.id);
        if (!pending) return;
        this.pendingPageRequests.delete(message.id);
        pending.reject(new Error(message.message));
        return;
      }
    }
  }

  run(code: string) {
    if (!this.worker) return;
    const id = crypto.randomUUID();
    this.currentRunId = id;
    this.callbacks.onStatusChange("running");
    this.worker.postMessage({ type: "run", id, code });
  }

  fetchDataframePage(
    handle: string,
    offset: number,
    limit: number,
    sort: DataframeSort | null,
  ): Promise<DataframePage> {
    if (!this.worker) return Promise.reject(new Error("worker not available"));
    const id = crypto.randomUUID();
    const promise = new Promise<DataframePage>((resolve, reject) => {
      this.pendingPageRequests.set(id, { resolve, reject });
    });
    this.worker.postMessage({ type: "dataframe-page", id, handle, offset, limit, sort });
    return promise;
  }

  private rejectPendingPageRequests(reason: string) {
    for (const pending of this.pendingPageRequests.values()) {
      pending.reject(new Error(reason));
    }
    this.pendingPageRequests.clear();
  }

  stop() {
    this.worker?.terminate();
    this.currentRunId = null;
    this.rejectPendingPageRequests("runner stopped");
    this.spawn();
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.rejectPendingPageRequests("runner disposed");
  }
}

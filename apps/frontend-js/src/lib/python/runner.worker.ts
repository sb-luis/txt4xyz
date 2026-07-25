import { loadPyodide, version, type PyodideInterface } from "pyodide";
import {
  parseMainToWorkerMessage,
  type WorkerToMainMessage,
} from "./protocol";

function post(message: WorkerToMainMessage) {
  self.postMessage(message);
}

let currentRunId: string | null = null;

function handleStdout(line: string) {
  if (currentRunId === null) return;
  post({ type: "stdout", id: currentRunId, line });
}

function handleStderr(line: string) {
  if (currentRunId === null) return;
  post({ type: "stderr", id: currentRunId, line });
}

async function init(): Promise<PyodideInterface> {
  const indexURL =
    import.meta.env.VITE_PYODIDE_INDEX_URL ??
    `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;

  return loadPyodide({
    indexURL,
    stdout: handleStdout,
    stderr: handleStderr,
  });
}

async function run(pyodide: PyodideInterface, id: string, code: string) {
  currentRunId = id;
  try {
    await pyodide.runPythonAsync(code);
    post({ type: "run-result", id });
  } catch (err) {
    post({ type: "run-error", id, traceback: String(err) });
  } finally {
    currentRunId = null;
  }
}

// Installed synchronously, before init resolves: a dedicated worker dispatches
// queued messages whether or not a listener exists, so a run sent during the
// multi-second load would otherwise be dropped with no trace.
const ready = init();

ready.then(
  () => post({ type: "ready" }),
  (err: unknown) => post({ type: "init-failure", message: String(err) }),
);

self.onmessage = (event: MessageEvent<unknown>) => {
  let message;
  try {
    message = parseMainToWorkerMessage(event.data);
  } catch {
    return;
  }

  void ready.then(
    (pyodide) => run(pyodide, message.id, message.code),
    () => {},
  );
};

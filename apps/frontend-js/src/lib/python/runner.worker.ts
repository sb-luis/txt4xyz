import { loadPyodide, version, type PyodideInterface } from "pyodide";
import {
  parseMainToWorkerMessage,
  type DisplayPayload,
  type StepEvent,
  type WorkerToMainMessage,
} from "./protocol";

// Exceeding this raises from inside the traced frame itself (see
// TRACE_RUNNER) rather than truncating silently, so a runaway loop surfaces
// as a normal run-error the user watches happen.
const MAX_TRACE_EVENTS = 5000;

// PyCF_ALLOW_TOP_LEVEL_AWAIT + eval(code_obj) mirrors Pyodide's own console so
// a bare top-level `await` still works. The trace function is filtered to
// frames compiled from this exact source (co_filename '<user_code>') so line
// events never fire for code inside pandas/numpy/etc.
const TRACE_RUNNER = `
import sys, ast

async def _txt4xyz_run_traced(source):
    code_obj = compile(source, '<user_code>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    def _trace(frame, event, arg):
        if frame.f_code.co_filename != '<user_code>':
            return None
        if event == 'line' and _on_trace_line(frame.f_lineno):
            raise RuntimeError('stopped after ${MAX_TRACE_EVENTS} steps -- did you write an infinite loop?')
        return _trace
    sys.settrace(_trace)
    try:
        result = eval(code_obj, globals())
        if result is not None:
            await result
    finally:
        sys.settrace(None)
`;

const INIT_MODULE = [
  "import os, sys, types",
  // Runs in a Web Worker with no `window`; matplotlib's default Pyodide
  // backend is interactive and expects one. Force Agg (non-interactive) so
  // plt.show() is a no-op — figures are captured via savefig() regardless.
  "os.environ.setdefault('MPLBACKEND', 'Agg')",
  "m = types.ModuleType('__main__')",
  "m.__dict__['__builtins__'] = __builtins__",
  "sys.modules['__main__'] = m",
  "m.__dict__",
].join("\n");

// Idempotent: run at the start of every run() against Pyodide's default
// globals, not the per-run `ns` that gets destroyed after every run — this
// is what lets a displayed dataframe stay pageable after its run has
// finished. The registry itself is only reset if missing, so re-running
// this doesn't clear dataframes registered by the run in progress.
const PERSISTENT_SETUP = [
  "if '_dataframe_registry' not in globals():",
  "    _dataframe_registry = {}",
  "",
  // sort_column_index is -1 (not None) for "no sort" -- Pyodide's JS->Python
  // conversion for a bare `null` argument doesn't reliably coerce to Python
  // `None` across proxy call boundaries, so an int sentinel avoids the
  // ambiguity rather than relying on an `is not None` check.
  "def _fetch_dataframe_page(handle, offset, limit, sort_column_index, sort_direction):",
  "    import json",
  "    import pandas as pd",
  "    df = _dataframe_registry.get(handle)",
  "    if df is None:",
  "        return json.dumps({'error': 'expired'})",
  "    view = df",
  "    if sort_column_index >= 0:",
  "        column = view.columns[sort_column_index]",
  "        view = view.sort_values(by=column, ascending=(sort_direction != 'desc'))",
  "    row_count = len(view)",
  "    page = view.iloc[offset:offset + limit]",
  "    rows = [",
  "        [None if pd.isna(v) else str(v) for v in row]",
  "        for row in page.itertuples(index=False)",
  "    ]",
  "    return json.dumps({'rows': rows, 'row_count': row_count})",
].join("\n");

// Executed with `globals: ns` (see run()) so these defs land directly in the
// run namespace and their closures resolve `_emit_display` from there too —
// the same namespace user code runs in, so nothing has to be re-exported.
const DEFINE_DISPLAY_HELPERS = [
  "def display(obj):",
  "    try:",
  "        import pandas as pd",
  "        if isinstance(obj, pd.DataFrame):",
  "            _emit_dataframe(obj)",
  "            return",
  "    except ImportError:",
  "        pass",
  "    repr_html = getattr(obj, '_repr_html_', None)",
  "    if callable(repr_html):",
  "        html = repr_html()",
  "        if html is not None:",
  "            _emit_html(html)",
  "            return",
  "    repr_svg = getattr(obj, '_repr_svg_', None)",
  "    if callable(repr_svg):",
  "        svg = repr_svg()",
  "        if svg is not None:",
  "            _emit_svg(svg)",
  "            return",
  "    repr_png = getattr(obj, '_repr_png_', None)",
  "    if callable(repr_png):",
  "        png = repr_png()",
  "        if png is not None:",
  "            _emit_image(png, 'image/png')",
  "            return",
  "    repr_json = getattr(obj, '_repr_json_', None)",
  "    if callable(repr_json):",
  "        data = repr_json()",
  "        if data is not None:",
  "            _emit_json(data)",
  "            return",
  "    print(repr(obj))",
  "",
  "def _emit_svg(svg):",
  "    import json",
  "    payload = {'kind': 'plot', 'svg': svg}",
  "    _emit_display(json.dumps(payload))",
  "",
  "def _emit_html(html):",
  "    import json",
  "    payload = {'kind': 'html', 'html': html}",
  "    _emit_display(json.dumps(payload))",
  "",
  "def _emit_image(data, mime):",
  "    import json, base64",
  "    b64 = data if isinstance(data, str) else base64.b64encode(data).decode('ascii')",
  "    payload = {'kind': 'image', 'mime': mime, 'data_base64': b64}",
  "    _emit_display(json.dumps(payload))",
  "",
  "def _emit_json(data):",
  "    import json",
  "    payload = {'kind': 'json', 'value': data}",
  "    _emit_display(json.dumps(payload))",
  "",
  "def _emit_dataframe(df):",
  "    import json, uuid",
  "    import pandas as pd",
  "    handle = str(uuid.uuid4())",
  "    _dataframe_registry[handle] = df",
  "    row_count = len(df)",
  "    truncated = row_count > 500",
  "    view = df.head(500)",
  // pandas' astype(str) deliberately leaves NaN/NaT as float NaN rather than
  // stringifying it, which json.dumps then emits as a bare `NaN` token --
  // invalid JSON that breaks JSON.parse on the main thread.
  "    rows = [",
  "        [None if pd.isna(v) else str(v) for v in row]",
  "        for row in view.itertuples(index=False)",
  "    ]",
  "    payload = {",
  "        'kind': 'dataframe',",
  "        'handle': handle,",
  "        'columns': [str(c) for c in view.columns],",
  "        'rows': rows,",
  "        'row_count': row_count,",
  "        'truncated': truncated,",
  "    }",
  "    _emit_display(json.dumps(payload))",
  "",
  "def _emit_plot(fig):",
  "    import io, json",
  "    buf = io.BytesIO()",
  "    fig.savefig(buf, format='svg')",
  "    payload = {'kind': 'plot', 'svg': buf.getvalue().decode('utf-8')}",
  "    _emit_display(json.dumps(payload))",
].join("\n");

const CAPTURE_PLOTS = [
  "import sys",
  "if 'matplotlib.pyplot' in sys.modules:",
  "    import matplotlib.pyplot as plt",
  "    for num in plt.get_fignums():",
  "        _emit_plot(plt.figure(num))",
  "    plt.close('all')",
].join("\n");

function toCamelDisplay(parsed: Record<string, unknown>): DisplayPayload {
  if (parsed.kind === "dataframe") {
    return {
      kind: "dataframe",
      handle: parsed.handle as string,
      columns: parsed.columns as string[],
      rows: parsed.rows as string[][],
      rowCount: parsed.row_count as number,
      truncated: parsed.truncated as boolean,
    };
  }
  if (parsed.kind === "image") {
    return {
      kind: "image",
      mime: parsed.mime as string,
      dataBase64: parsed.data_base64 as string,
    };
  }
  return parsed as DisplayPayload;
}

function post(message: WorkerToMainMessage) {
  self.postMessage(message);
}

let currentRunId: string | null = null;

// While `recording` is true (runTraced), output is buffered per line instead
// of streamed, so it can be attached to the step that produced it.
let recording = false;
let traceEventCount = 0;
let pendingLine: number | null = null;
let pendingStdout: string[] = [];
let pendingStderr: string[] = [];
let pendingDisplay: DisplayPayload[] = [];
let recordedSteps: StepEvent[] = [];

function flushPendingStep() {
  if (pendingLine === null) return;
  recordedSteps.push({
    line: pendingLine,
    stdout: pendingStdout,
    stderr: pendingStderr,
    display: pendingDisplay,
  });
  pendingStdout = [];
  pendingStderr = [];
  pendingDisplay = [];
}

// Bound into the traced namespace as `_on_trace_line`. Returns true once the
// step cap is hit, so Python can raise from inside the traced frame itself.
function onTraceLine(lineno: number): boolean {
  flushPendingStep();
  pendingLine = lineno;
  traceEventCount += 1;
  return traceEventCount > MAX_TRACE_EVENTS;
}

// Exported only so tests can wire the same capture path into a standalone
// Pyodide instance -- production code always goes through `init()` below.
export function handleStdoutForTests(line: string) {
  handleStdout(line);
}
export function handleStderrForTests(line: string) {
  handleStderr(line);
}

function handleStdout(line: string) {
  if (currentRunId === null) return;
  if (recording) {
    pendingStdout.push(line);
    return;
  }
  post({ type: "stdout", id: currentRunId, line });
}

function handleStderr(line: string) {
  if (currentRunId === null) return;
  if (recording) {
    pendingStderr.push(line);
    return;
  }
  post({ type: "stderr", id: currentRunId, line });
}

function handleDisplay(jsonPayload: string) {
  if (currentRunId === null) return;
  const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
  const display = toCamelDisplay(parsed);
  if (recording) {
    pendingDisplay.push(display);
    return;
  }
  post({ type: "display", id: currentRunId, display });
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

export async function run(pyodide: PyodideInterface, id: string, code: string) {
  currentRunId = id;
  pyodide.runPython(PERSISTENT_SETUP);
  // Dataframes displayed by the previous run become unreachable the moment
  // a new run starts -- their variables don't survive either.
  pyodide.runPython("_dataframe_registry.clear()");
  const ns = pyodide.runPython(INIT_MODULE);
  ns.set("_emit_display", handleDisplay);
  ns.set("_dataframe_registry", pyodide.globals.get("_dataframe_registry"));
  pyodide.runPython(DEFINE_DISPLAY_HELPERS, { globals: ns });
  let runError: unknown = null;
  try {
    await pyodide.loadPackagesFromImports(code);
    await pyodide.runPythonAsync(code, { globals: ns });
  } catch (err) {
    runError = err;
  }
  try {
    pyodide.runPython(CAPTURE_PLOTS, { globals: ns });
  } catch (err) {
    // A broken plot capture must not mask the run's actual result/error
    handleStderr(`[plot capture failed] ${String(err)}`);
  }
  if (runError !== null) {
    post({ type: "run-error", id, traceback: String(runError) });
  } else {
    post({ type: "run-result", id });
  }
  ns.destroy();
  currentRunId = null;
}

export async function runTraced(pyodide: PyodideInterface, id: string, code: string) {
  currentRunId = id;
  pyodide.runPython(PERSISTENT_SETUP);
  // Dataframes displayed by the previous run become unreachable the moment
  // a new run starts -- their variables don't survive either.
  pyodide.runPython("_dataframe_registry.clear()");
  const ns = pyodide.runPython(INIT_MODULE);
  ns.set("_emit_display", handleDisplay);
  ns.set("_dataframe_registry", pyodide.globals.get("_dataframe_registry"));
  ns.set("_on_trace_line", onTraceLine);
  pyodide.runPython(DEFINE_DISPLAY_HELPERS, { globals: ns });
  pyodide.runPython(TRACE_RUNNER, { globals: ns });

  recording = true;
  traceEventCount = 0;
  pendingLine = null;
  pendingStdout = [];
  pendingStderr = [];
  pendingDisplay = [];
  recordedSteps = [];

  let runError: unknown = null;
  try {
    await pyodide.loadPackagesFromImports(code);
    await (ns.get("_txt4xyz_run_traced")(code) as Promise<unknown>);
  } catch (err) {
    runError = err;
  }
  try {
    pyodide.runPython(CAPTURE_PLOTS, { globals: ns });
  } catch (err) {
    // A broken plot capture must not mask the run's actual result/error
    handleStderr(`[plot capture failed] ${String(err)}`);
  }
  // Flush after CAPTURE_PLOTS so any plot emitted from the last executed line
  // lands in that line's step rather than being dropped when recording ends.
  flushPendingStep();
  recording = false;

  post({ type: "run-timeline", id, steps: recordedSteps });
  if (runError !== null) {
    post({ type: "run-error", id, traceback: String(runError) });
  } else {
    post({ type: "run-result", id });
  }
  ns.destroy();
  currentRunId = null;
}

async function fetchDataframePage(
  pyodide: PyodideInterface,
  id: string,
  handle: string,
  offset: number,
  limit: number,
  sort: { columnIndex: number; direction: "asc" | "desc" } | null,
) {
  const resultJson = pyodide.globals.get("_fetch_dataframe_page")(
    handle,
    offset,
    limit,
    sort?.columnIndex ?? -1,
    sort?.direction ?? "",
  ) as string;
  const parsed = JSON.parse(resultJson) as
    | { error: string }
    | { rows: (string | null)[][]; row_count: number };
  if ("error" in parsed) {
    post({ type: "dataframe-page-error", id, message: parsed.error });
    return;
  }
  post({ type: "dataframe-page-result", id, rows: parsed.rows, rowCount: parsed.row_count });
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

  if (message.type === "run") {
    const { id, code } = message;
    void ready.then(
      (pyodide) => run(pyodide, id, code),
      () => {},
    );
    return;
  }

  if (message.type === "run-traced") {
    const { id, code } = message;
    void ready.then(
      (pyodide) => runTraced(pyodide, id, code),
      () => {},
    );
    return;
  }

  const { id, handle, offset, limit, sort } = message;
  void ready.then(
    (pyodide) => fetchDataframePage(pyodide, id, handle, offset, limit, sort),
    () => {},
  );
};

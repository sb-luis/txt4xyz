import { loadPyodide, version, type PyodideInterface } from "pyodide";
import {
  parseMainToWorkerMessage,
  type DisplayPayload,
  type WorkerToMainMessage,
} from "./protocol";

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
  "    import json",
  "    row_count = len(df)",
  "    truncated = row_count > 500",
  "    view = df.head(500).astype(str)",
  "    payload = {",
  "        'kind': 'dataframe',",
  "        'columns': [str(c) for c in view.columns],",
  "        'rows': view.values.tolist(),",
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

function handleStdout(line: string) {
  if (currentRunId === null) return;
  post({ type: "stdout", id: currentRunId, line });
}

function handleStderr(line: string) {
  if (currentRunId === null) return;
  post({ type: "stderr", id: currentRunId, line });
}

function handleDisplay(jsonPayload: string) {
  if (currentRunId === null) return;
  const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
  post({ type: "display", id: currentRunId, display: toCamelDisplay(parsed) });
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
  const ns = pyodide.runPython(INIT_MODULE);
  ns.set("_emit_display", handleDisplay);
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

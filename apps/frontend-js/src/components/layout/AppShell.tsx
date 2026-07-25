import { useCallback, useRef } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { AppHeader } from "@/components/layout/AppHeader";
import { Pane } from "@/components/layout/Pane";
import { OutputPane } from "@/components/output/OutputPane";
import { usePythonRunner } from "@/lib/python/usePythonRunner";

const DEFAULT_CODE = `for i in range(5):
    print(f"hello from txt4.xyz, iteration {i}")
`;

export function AppShell() {
  const { status, output, run, stop, clearOutput } = usePythonRunner();
  const codeRef = useRef(DEFAULT_CODE);

  const handleRun = useCallback(() => {
    clearOutput();
    run(codeRef.current);
  }, [clearOutput, run]);

  return (
    <div className="flex h-full flex-col bg-app-bg text-app-fg">
      <AppHeader status={status} onRun={handleRun} onStop={stop} />
      <main className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden bg-app-border md:flex-row">
        <Pane title="editor">
          <CodeEditor
            initialDoc={DEFAULT_CODE}
            onChange={(doc) => {
              codeRef.current = doc;
            }}
          />
        </Pane>
        <Pane title="output">
          <OutputPane status={status} output={output} />
        </Pane>
      </main>
    </div>
  );
}

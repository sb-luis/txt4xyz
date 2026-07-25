import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { AppHeader } from "@/components/layout/AppHeader";
import { Pane } from "@/components/layout/Pane";
import { OutputPane } from "@/components/output/OutputPane";
import { usePythonRunner } from "@/lib/python/usePythonRunner";
import { createDebouncedDocWriter } from "@/lib/persistence/localStore";
import { resolveInitialDoc } from "@/lib/persistence/resolveInitialDoc";

const DEFAULT_CODE = `for i in range(5):
    print(f"hello from txt4.xyz, iteration {i}")
`;

export function AppShell() {
  const { status, output, run, stop, clearOutput } = usePythonRunner();
  const [initialDoc] = useState(() => resolveInitialDoc(DEFAULT_CODE));
  const codeRef = useRef(initialDoc);
  const [writer] = useState(() => createDebouncedDocWriter());

  useEffect(() => {
    return () => writer.cancel();
  }, [writer]);

  const handleRun = useCallback(() => {
    clearOutput();
    run(codeRef.current);
  }, [clearOutput, run]);

  return (
    <div className="flex h-full flex-col bg-app-bg text-app-fg">
      <AppHeader status={status} onRun={handleRun} onStop={stop} getCode={() => codeRef.current} />
      <main className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden bg-app-border md:flex-row">
        <Pane title="editor">
          <CodeEditor
            initialDoc={initialDoc}
            onChange={(doc) => {
              codeRef.current = doc;
              writer.schedule(doc);
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

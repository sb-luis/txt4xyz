import { useEffect, useRef } from "react";
import type { OutputEntry, RunnerStatus } from "@/lib/python/runner";

export interface OutputPaneProps {
  status: RunnerStatus;
  output: OutputEntry[];
}

export function OutputPane({ status, output }: OutputPaneProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [output]);

  if (status === "loading") {
    return <p className="font-mono text-sm text-app-fg/70">loading Python runtime…</p>;
  }

  if (status === "error") {
    return <p className="font-mono text-sm text-app-error">Python runtime failed to load.</p>;
  }

  if (output.length === 0) {
    return <p className="font-mono text-sm text-app-fg/70">Run your code to see output here.</p>;
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-sm">
      {output.map((entry, index) => (
        <div
          key={index}
          className={entry.kind === "stdout" ? "text-app-fg" : "text-app-error"}
        >
          {entry.kind === "traceback" ? entry.text : entry.line}
        </div>
      ))}
      <div ref={endRef} />
    </pre>
  );
}

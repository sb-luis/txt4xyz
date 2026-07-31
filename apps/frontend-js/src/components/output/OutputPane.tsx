import { useEffect, useRef } from "react";
import type { OutputEntry, RunnerStatus } from "@/lib/python/runner";
import { DataFrameTable } from "./DataFrameTable";
import { PlotView } from "./PlotView";
import { HtmlView } from "./HtmlView";
import { ImageView } from "./ImageView";
import { JsonView } from "./JsonView";

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
    return <p className="font-mono text-sm text-muted-foreground">loading Python runtime…</p>;
  }

  if (status === "error") {
    return <p className="font-mono text-sm text-destructive">Python runtime failed to load.</p>;
  }

  if (output.length === 0) {
    return <p className="font-mono text-sm text-muted-foreground">Run your code to see output here.</p>;
  }

  return (
    <div className="whitespace-pre-wrap break-words font-mono text-sm">
      {output.map((entry, index) => renderEntry(entry, index))}
      <div ref={endRef} />
    </div>
  );
}

function renderEntry(entry: OutputEntry, key: number) {
  switch (entry.kind) {
    case "dataframe":
      return (
        <div key={key} className="py-1">
          <DataFrameTable
            columns={entry.columns}
            rows={entry.rows}
            rowCount={entry.rowCount}
            truncated={entry.truncated}
          />
        </div>
      );
    case "plot":
      return (
        <div key={key} className="py-1">
          <PlotView svg={entry.svg} />
        </div>
      );
    case "html":
      return (
        <div key={key} className="py-1">
          <HtmlView html={entry.html} />
        </div>
      );
    case "image":
      return (
        <div key={key} className="py-1">
          <ImageView mime={entry.mime} dataBase64={entry.dataBase64} />
        </div>
      );
    case "json":
      return (
        <div key={key} className="py-1">
          <JsonView value={entry.value} />
        </div>
      );
    case "traceback":
      return (
        <div key={key} className="text-destructive">
          {entry.text}
        </div>
      );
    case "stdout":
      return (
        <div key={key} className="text-foreground">
          {entry.line}
        </div>
      );
    case "stderr":
      return (
        <div key={key} className="text-destructive">
          {entry.line}
        </div>
      );
  }
}

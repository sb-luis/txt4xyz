import type { ReactNode } from "react";

export function Pane({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm"
    >
      <header className="shrink-0 border-b border-app-border bg-app-surface px-4 py-2">
        <h2 className="font-mono text-xs uppercase tracking-wide text-app-muted">
          {title}
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </section>
  );
}

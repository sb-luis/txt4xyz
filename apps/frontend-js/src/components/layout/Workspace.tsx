import type { ReactNode } from "react";

export interface WorkspaceProps {
  editor: ReactNode;
  output: ReactNode;
  outputCollapsed: boolean;
  onToggleOutput: () => void;
}

// A single grid drives both the 60/40 split and the collapse animation: its
// track sizes are plain fr values, which browsers interpolate smoothly as
// long as the track count stays the same across the transition.
const EXPANDED_TRACKS = "grid-rows-[3fr_2fr] md:grid-cols-[3fr_2fr]";
const COLLAPSED_TRACKS = "grid-rows-[1fr_0fr] md:grid-cols-[1fr_0fr]";

export function Workspace({ editor, output, outputCollapsed, onToggleOutput }: WorkspaceProps) {
  return (
    <div
      className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm transition-[grid-template-rows,grid-template-columns] duration-300 ease-in-out md:grid-rows-1 ${
        outputCollapsed ? COLLAPSED_TRACKS : EXPANDED_TRACKS
      }`}
    >
      <section aria-label="editor" className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-app-border px-4 py-2">
          <h2 className="font-mono text-xs uppercase tracking-wide text-app-muted">editor</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4">{editor}</div>

        <button
          type="button"
          onClick={onToggleOutput}
          aria-expanded={!outputCollapsed}
          aria-controls="output-panel"
          aria-label={outputCollapsed ? "expand output" : "collapse output"}
          className="absolute bottom-3 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-app-border bg-app-surface text-app-muted shadow-sm transition hover:text-app-fg md:bottom-auto md:left-auto md:right-3 md:top-1/2 md:translate-x-0 md:-translate-y-1/2"
        >
          {/* Points the direction the click will collapse the panel toward
              (down on mobile, right on desktop); flips 180° once collapsed
              to point back the way it will expand. */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-4 w-4 transition-transform duration-300 ease-in-out md:hidden ${outputCollapsed ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`hidden h-4 w-4 transition-transform duration-300 ease-in-out md:block ${outputCollapsed ? "rotate-180" : ""}`}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </section>

      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden md:flex-row">
        <div className="h-px w-full shrink-0 bg-app-border md:h-full md:w-px" />
        <section
          id="output-panel"
          aria-label="output"
          aria-hidden={outputCollapsed}
          inert={outputCollapsed}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <header className="shrink-0 border-b border-app-border px-4 py-2">
            <h2 className="font-mono text-xs uppercase tracking-wide text-app-muted">output</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-4">{output}</div>
        </section>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { CollapseExpandToggle } from "@/components/ui/CollapseExpandToggle";

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
      className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-lg border border-app-hairline bg-app-bg shadow-sm transition-[grid-template-rows,grid-template-columns] duration-300 ease-in-out md:grid-rows-1 ${
        outputCollapsed ? COLLAPSED_TRACKS : EXPANDED_TRACKS
      }`}
    >
      <section aria-label="editor" className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-app-hairline px-4 py-2">
          <h2 className="font-mono text-xs uppercase tracking-wide text-app-fg/70">
            editor
          </h2>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4">{editor}</div>

        <CollapseExpandToggle collapsed={outputCollapsed} onToggle={onToggleOutput} />
      </section>

      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden md:flex-row">
        <div className="h-px w-full shrink-0 bg-app-hairline md:h-full md:w-px" />
        <section
          id="output-panel"
          aria-label="output"
          aria-hidden={outputCollapsed}
          inert={outputCollapsed}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <header className="shrink-0 border-b border-app-hairline px-4 py-2">
            <h2 className="font-mono text-xs uppercase tracking-wide text-app-fg/70">
              output
            </h2>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-4">{output}</div>
        </section>
      </div>
    </div>
  );
}

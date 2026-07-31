import { useEffect, useState, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { usePanelCallbackRef } from "react-resizable-panels";
import type { WorkspaceLayout } from "@/lib/workspace/layout";

export interface WorkspaceProps {
  editor: ReactNode;
  output: ReactNode;
  layout: WorkspaceLayout;
}

const DESKTOP_QUERY = "(min-width: 768px)";

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export function Workspace({ editor, output, layout }: WorkspaceProps) {
  const isDesktop = useIsDesktop();
  const [editorPanel, setEditorPanel] = usePanelCallbackRef();
  const [outputPanel, setOutputPanel] = usePanelCallbackRef();

  // Drives collapse from the layout switcher (toggle group / keyboard
  // shortcut) rather than the drag gesture — react-resizable-panels handles
  // drag-driven resizing on its own via minSize/collapsedSize.
  useEffect(() => {
    if (editorPanel === null || outputPanel === null) return;
    if (layout === "editor") {
      outputPanel.collapse();
      if (editorPanel.isCollapsed()) editorPanel.expand();
    } else if (layout === "output") {
      editorPanel.collapse();
      if (outputPanel.isCollapsed()) outputPanel.expand();
    } else {
      if (editorPanel.isCollapsed()) editorPanel.expand();
      if (outputPanel.isCollapsed()) outputPanel.expand();
    }
  }, [layout, editorPanel, outputPanel]);

  const editorCollapsed = layout === "output";
  const outputCollapsed = layout === "editor";

  return (
    <ResizablePanelGroup
      orientation={isDesktop ? "horizontal" : "vertical"}
      className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-sm"
    >
      <ResizablePanel
        id="editor"
        defaultSize={60}
        minSize={20}
        collapsible
        collapsedSize={0}
        panelRef={setEditorPanel}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      >
        <section
          aria-label="editor"
          aria-hidden={editorCollapsed}
          inert={editorCollapsed}
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
        >
          <div className="shrink-0 border-b border-border px-4 py-2 text-sm font-medium">
            Editor
          </div>
          <div className="min-h-0 flex-1 overflow-auto">{editor}</div>
        </section>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel
        id="output"
        defaultSize={40}
        minSize={20}
        collapsible
        collapsedSize={0}
        panelRef={setOutputPanel}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      >
        <section
          id="output-panel"
          aria-label="output"
          aria-hidden={outputCollapsed}
          inert={outputCollapsed}
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
        >
          <div className="shrink-0 border-b border-border px-4 py-2 text-sm font-medium">
            Output
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">{output}</div>
        </section>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

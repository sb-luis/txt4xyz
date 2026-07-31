import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  usePanelCallbackRef,
  type Layout,
  type LayoutChangedMeta,
} from "react-resizable-panels";
import type { WorkspaceLayout } from "@/lib/workspace/layout";

export interface WorkspaceProps {
  editor: ReactNode;
  output: ReactNode;
  layout: WorkspaceLayout;
  onLayoutChange: (layout: WorkspaceLayout) => void;
}

const DESKTOP_QUERY = "(min-width: 768px)";
const LAYOUT_TRANSITION_MS = 200;
const LAYOUT_TRANSITION_STYLE = `flex ${LAYOUT_TRANSITION_MS}ms ease-in-out`;

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

export function Workspace({ editor, output, layout, onLayoutChange }: WorkspaceProps) {
  const isDesktop = useIsDesktop();
  const [editorPanel, setEditorPanel] = usePanelCallbackRef();
  const [outputPanel, setOutputPanel] = usePanelCallbackRef();
  const [isAnimating, setIsAnimating] = useState(false);
  const editorElRef = useRef<HTMLDivElement | null>(null);
  const outputElRef = useRef<HTMLDivElement | null>(null);
  // Set right before a drag-driven layout change so the effect below can
  // skip re-animating a transition the user's own drag already completed.
  const skipNextAnimationRef = useRef(false);
  const didMountRef = useRef(false);

  // Drives collapse from the layout switcher (toggle group / keyboard
  // shortcut) rather than the drag gesture — react-resizable-panels handles
  // drag-driven resizing on its own via minSize/collapsedSize.
  useEffect(() => {
    if (editorPanel === null || outputPanel === null) return;

    const applyLayout = () => {
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
    };

    const skipAnimation = skipNextAnimationRef.current || !didMountRef.current;
    skipNextAnimationRef.current = false;
    didMountRef.current = true;

    if (skipAnimation) {
      applyLayout();
      return;
    }

    setIsAnimating(true);
    if (editorElRef.current) editorElRef.current.style.transition = LAYOUT_TRANSITION_STYLE;
    if (outputElRef.current) outputElRef.current.style.transition = LAYOUT_TRANSITION_STYLE;
    void editorElRef.current?.offsetHeight;
    void outputElRef.current?.offsetHeight;
    applyLayout();

    const timeout = window.setTimeout(() => {
      setIsAnimating(false);
      if (editorElRef.current) editorElRef.current.style.transition = "";
      if (outputElRef.current) outputElRef.current.style.transition = "";
    }, LAYOUT_TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [layout, editorPanel, outputPanel]);

  // Dragging the handle to either extreme is a manual layout switch too —
  // keep the toggle group / keyboard shortcut in sync with it.
  const handleLayoutChanged = useCallback(
    (nextLayout: Layout, meta: LayoutChangedMeta) => {
      if (!meta.isUserInteraction) return;
      const editorSize = nextLayout.editor ?? 0;
      const outputSize = nextLayout.output ?? 0;
      const next: WorkspaceLayout =
        editorSize === 0 ? "output" : outputSize === 0 ? "editor" : "split";
      if (next === layout) return;
      skipNextAnimationRef.current = true;
      onLayoutChange(next);
    },
    [layout, onLayoutChange]
  );

  const editorCollapsed = layout === "output";
  const outputCollapsed = layout === "editor";

  return (
    <ResizablePanelGroup
      orientation={isDesktop ? "horizontal" : "vertical"}
      onLayoutChanged={handleLayoutChanged}
      className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-sm"
    >
      <ResizablePanel
        id="editor"
        defaultSize={60}
        minSize={20}
        collapsible
        collapsedSize={0}
        panelRef={setEditorPanel}
        elementRef={editorElRef}
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

      <ResizableHandle disabled={isAnimating} />

      <ResizablePanel
        id="output"
        defaultSize={40}
        minSize={20}
        collapsible
        collapsedSize={0}
        panelRef={setOutputPanel}
        elementRef={outputElRef}
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

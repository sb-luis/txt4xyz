import { AppHeader } from "@/components/layout/AppHeader";
import { Pane } from "@/components/layout/Pane";

export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-app-bg text-app-fg">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden bg-app-border md:flex-row">
        <Pane title="editor">
          <p className="font-mono text-sm text-app-muted">
            Editor loads in Phase 1.
          </p>
        </Pane>
        <Pane title="output">
          <p className="font-mono text-sm text-app-muted">
            Output appears here in Phase 1.
          </p>
        </Pane>
      </main>
    </div>
  );
}

import { Button } from "@/components/ui/Button";

export function Homepage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-app-bg px-6 text-center text-app-fg">
      <span className="font-mono text-4xl font-semibold text-app-fg">txt4xyz</span>
      <p className="max-w-md font-sans text-base text-app-muted">
        An in-browser Python scratchpad. Collaborative and ephemeral. Rooms disappear when
        everyone leaves.
      </p>
      <Button href="/edit" target="_blank" rel="noopener noreferrer">
        Open the editor
      </Button>
    </div>
  );
}

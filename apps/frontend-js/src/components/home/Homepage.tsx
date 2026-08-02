import { Button } from "@/components/ui/button";

export function Homepage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <span className="text-4xl font-semibold text-foreground">txt4xyz</span>
      <p className="max-w-md text-base text-muted-foreground">
        An in-browser Python scratchpad. Run code fully offline, or share a link and collaborate
        live. Rooms are ephemeral and disappear when everyone leaves.
      </p>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <a href="/offline" target="_blank" rel="noopener noreferrer">
            Offline
          </a>
        </Button>
        <Button asChild>
          <a href="/edit" target="_blank" rel="noopener noreferrer">
            Collab
          </a>
        </Button>
      </div>
    </div>
  );
}

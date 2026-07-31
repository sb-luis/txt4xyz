import { Button } from "@/components/ui/button";

export function Homepage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <span className="font-mono text-4xl font-semibold text-foreground">txt4xyz</span>
      <p className="max-w-md font-sans text-base text-foreground/70">
        An in-browser Python scratchpad. Collaborative and ephemeral. Rooms disappear when
        everyone leaves.
      </p>
      <Button asChild>
        <a href="/edit" target="_blank" rel="noopener noreferrer">
          Open the editor
        </a>
      </Button>
    </div>
  );
}

export function Homepage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-app-bg px-6 text-center text-app-fg">
      <span className="font-mono text-3xl font-semibold">txt4.xyz</span>
      <p className="max-w-md font-mono text-sm text-app-muted">
        An in-browser Python scratchpad. Collaborative and ephemeral. Rooms disappear when everyone leaves.
      </p>
      <a
        href="/edit"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded border border-app-border px-4 py-2 font-mono text-sm text-app-fg hover:bg-app-surface"
      >
        Open the editor
      </a>
    </div>
  );
}

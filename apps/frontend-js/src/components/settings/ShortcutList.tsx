import { SHORTCUTS } from "@/lib/shortcuts/shortcuts";

export function ShortcutList() {
  return (
    <dl className="divide-y divide-border rounded-md border border-border">
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.id} className="flex items-center justify-between gap-4 px-3 py-2">
          <dt className="text-muted-foreground">{shortcut.description}</dt>
          <dd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
            {shortcut.keys}
          </dd>
        </div>
      ))}
    </dl>
  );
}

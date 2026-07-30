import { SHORTCUTS } from "@/lib/shortcuts/shortcuts";

export function ShortcutList() {
  return (
    <dl className="flex flex-col gap-1.5">
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.id} className="flex items-center justify-between gap-4">
          <dt className="text-app-fg/70">{shortcut.description}</dt>
          <dd className="rounded border border-app-hairline px-1.5 py-0.5 text-xs">
            {shortcut.keys}
          </dd>
        </div>
      ))}
    </dl>
  );
}

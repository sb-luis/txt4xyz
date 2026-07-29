import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface PopoverProps {
  /** Rendered as the trigger button's content. */
  trigger: ReactNode;
  /** Rendered inside the panel when open. */
  children: ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  triggerLabel?: string;
}

const DEFAULT_TRIGGER_CLASS =
  "flex cursor-pointer items-center gap-1.5 font-mono text-xs text-app-muted hover:text-app-fg";

const DEFAULT_PANEL_CLASS =
  "absolute left-0 top-full z-10 mt-1.5 min-w-max rounded border border-app-border bg-app-surface p-2 font-mono text-xs text-app-fg";

/**
 * Anchor-based popover: a trigger button that opens a panel positioned
 * below it. Closes on outside click, Escape, or re-clicking the trigger.
 * No animation — motion is deferred until layout/style is locked in.
 */
export function Popover({
  trigger,
  children,
  triggerClassName = DEFAULT_TRIGGER_CLASS,
  panelClassName = DEFAULT_PANEL_CLASS,
  triggerLabel,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div role="dialog" id={panelId} className={panelClassName}>
          {children}
        </div>
      )}
    </div>
  );
}

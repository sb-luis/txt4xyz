import { useEffect, useId, useRef, type ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Centered dialog with a backdrop. Closes on Escape, backdrop click, or the
 * close button. Focuses the panel on open so keyboard input (and Escape)
 * routes through it rather than whatever had focus before it opened.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-app-bg/85 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded border border-app-border bg-app-bg p-4 font-mono text-sm text-app-fg shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xs uppercase tracking-wide text-app-fg/70">
            {title}
          </h2>
          <button
            type="button"
            aria-label="close settings"
            onClick={onClose}
            className="cursor-pointer text-app-fg/60 hover:text-app-fg"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

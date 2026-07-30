import { Button } from "@/components/ui/Button";

export interface CollapseExpandToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function CollapseExpandToggle({ collapsed, onToggle }: CollapseExpandToggleProps) {
  return (
    <Button
      iconOnly
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls="output-panel"
      aria-label={collapsed ? "expand output" : "collapse output"}
      className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 shadow-sm md:bottom-auto md:left-auto md:right-3 md:top-1/2 md:translate-x-0 md:-translate-y-1/2"
    >
      {/* Points the direction the click will collapse the panel toward
          (down on mobile, right on desktop); flips 180° once collapsed
          to point back the way it will expand. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`h-4 w-4 transition-transform duration-300 ease-in-out md:hidden ${collapsed ? "rotate-180" : ""}`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`hidden h-4 w-4 transition-transform duration-300 ease-in-out md:block ${collapsed ? "rotate-180" : ""}`}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Button>
  );
}

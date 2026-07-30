export interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  "aria-label": string;
}

export function Switch({ checked, onChange, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-app-button-bg transition active:scale-[0.98]"
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-app-button-fg transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

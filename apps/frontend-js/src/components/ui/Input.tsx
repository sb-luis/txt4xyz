import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`h-7 rounded-full bg-app-button-bg px-3 font-mono text-sm text-app-button-fg outline-none placeholder:text-app-button-fg/40 ${className}`}
      {...props}
    />
  );
}

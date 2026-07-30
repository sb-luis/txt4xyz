import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "danger";

const BASE_CLASS =
  "inline-flex h-7 items-center justify-center gap-2 rounded-full font-mono text-sm font-medium transition active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:bg-app-button-bg-disabled disabled:active:scale-100";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-app-button-bg text-app-button-fg hover:bg-app-button-bg-hover",
  danger: "bg-app-surface-bg text-app-error hover:bg-app-error/10",
};

// Icon-only buttons (ThemeSwitcher, CollapseExpandToggle) are fixed-width
// circles matching the h-7 w-7 AvatarPill size; text buttons get horizontal
// padding instead of a fixed width.
const SHAPE_CLASS = {
  default: "px-4",
  icon: "w-7 p-0",
};

interface CommonProps {
  variant?: Variant;
  iconOnly?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button({
  variant = "primary",
  iconOnly = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `${BASE_CLASS} ${VARIANT_CLASS[variant]} ${SHAPE_CLASS[iconOnly ? "icon" : "default"]} ${className}`;

  if (props.href !== undefined) {
    const { href, ...rest } = props as ButtonAsAnchor;
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  const { type = "button", ...rest } = props as ButtonAsButton;
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

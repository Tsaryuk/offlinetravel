"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "text";
type Size = "md" | "sm" | "lg";

const base = "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none select-none";
const variants: Record<Variant, string> = {
  primary: "bg-inverse text-inverse-fg",
  accent: "bg-accent text-white",
  ghost: "bg-transparent text-ink border border-line",
  danger: "bg-bad text-white",
  text: "bg-transparent text-ink underline underline-offset-4 decoration-line",
};
const sizes: Record<Size, string> = {
  lg: "h-14 px-6 text-[16px] w-full",
  md: "h-12 px-5 text-[15px]",
  sm: "h-9 px-4 text-[13px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; children: ReactNode }) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  );
}

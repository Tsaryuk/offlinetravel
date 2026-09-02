"use client";

import type { ReactNode } from "react";

export function Chip({ on, children, onClick, className = "" }: { on?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-pill border px-4 py-[9px] text-[13px] font-medium transition active:scale-[.96] ${
        on ? "border-inverse bg-inverse text-inverse-fg" : "border-line bg-transparent text-ink-2"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`no-scrollbar flex gap-1.5 overflow-x-auto ${className}`}>{children}</div>;
}

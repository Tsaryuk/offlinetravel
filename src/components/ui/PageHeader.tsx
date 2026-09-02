import type { ReactNode } from "react";

export function PageHeader({ title, right, sub }: { title: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-bg pb-4 pt-5" style={{ paddingTop: "calc(20px + var(--safe-top))" }}>
      <div className="min-w-0">
        <h1 className="truncate text-[28px] font-medium leading-none tracking-[-0.03em]">{title}</h1>
        {sub && <div className="mt-1.5 text-[13px] text-ink-2">{sub}</div>}
      </div>
      {right && <div className="ml-3 flex shrink-0 items-center gap-1">{right}</div>}
    </div>
  );
}

export function IconButton({ children, onClick, label, className = "" }: { children: ReactNode; onClick?: () => void; label: string; className?: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition active:scale-95 active:text-ink ${className}`}>
      {children}
    </button>
  );
}

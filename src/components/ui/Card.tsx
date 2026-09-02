import type { HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`rounded-card bg-surface ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function StatTile({ value, label, tone, onClick }: { value: string; label: string; tone?: "good" | "bad"; onClick?: () => void }) {
  const color = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <Card className={`px-[18px] pb-4 pt-[18px] ${onClick ? "cursor-pointer active:bg-surface-2" : ""}`} onClick={onClick}>
      <div className={`tabular text-[26px] font-medium leading-none tracking-[-0.03em] ${color}`}>{value}</div>
      <div className="mt-2 text-[12px] font-medium text-ink-2">{label}</div>
    </Card>
  );
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-2.5 mt-5 text-[12px] font-medium text-ink-2 ${className}`}>{children}</div>;
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface text-[30px]">{icon}</div>
      <div className="text-[18px] font-medium tracking-[-0.02em]">{title}</div>
      {text && <div className="mt-1.5 max-w-[240px] text-[13.5px] leading-snug text-ink-2">{text}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

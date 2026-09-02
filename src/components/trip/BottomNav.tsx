"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsFetching, useIsMutating, useMutationState } from "@tanstack/react-query";
import { useOnline } from "@/lib/client/useOnline";

const items = (id: string) => [
  { href: `/t/${id}`, label: "Главная", icon: <path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z" /> },
  { href: `/t/${id}/expenses`, label: "Расходы", icon: <><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></> },
  { href: `/t/${id}/places`, label: "Места", icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></> },
  { href: `/t/${id}/chat`, label: "Чат", icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /> },
  { href: `/t/${id}/members`, label: "Участники", icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></> },
];

export function BottomNav({ tripId }: { tripId: string }) {
  const path = usePathname();
  const online = useOnline();
  const pending = useMutationState({ filters: { status: "pending" }, select: (m) => m.state.isPaused }).filter(Boolean).length;
  const fetching = useIsFetching();
  const mutating = useIsMutating();

  return (
    <>
      {(!online || pending > 0) && (
        <div className="fixed left-0 right-0 top-0 z-[50] flex items-center justify-center gap-2 bg-inverse px-3 py-1.5 text-[12px] font-medium text-inverse-fg" style={{ paddingTop: "calc(6px + var(--safe-top))" }}>
          {!online ? "Офлайн — изменения сохранятся и отправятся позже" : `Отправляем ${pending} ${pending === 1 ? "запись" : "записи"}…`}
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-[40] border-t border-line bg-bg" style={{ paddingBottom: "var(--safe-bottom)" }}>
        <div className="mx-auto flex max-w-lg items-center" style={{ height: "var(--nav-h)" }}>
          {items(tripId).map((it) => {
            const on = it.href === `/t/${tripId}` ? path === it.href : path.startsWith(it.href);
            return (
              <Link key={it.href} href={it.href} className={`relative flex h-full flex-1 flex-col items-center justify-center gap-1.5 transition active:scale-95 ${on ? "text-ink" : "text-ink-3"}`}>
                {on && <span className="absolute top-2 h-[5px] w-[5px] rounded-full bg-accent" />}
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{it.icon}</svg>
                <span className="text-[10.5px] font-medium leading-none">{it.label}</span>
              </Link>
            );
          })}
        </div>
        {(fetching > 0 || mutating > 0) && <div className="absolute left-0 top-0 h-[2px] w-full overflow-hidden"><div className="h-full w-1/3 bg-accent" style={{ animation: "shimmer 1.2s linear infinite", backgroundSize: "300% 100%" }} /></div>}
      </nav>
    </>
  );
}

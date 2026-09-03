"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/lib/client/hooks";
import { api } from "@/lib/client/api";
import { dateRange, tripPhase, phaseLabel } from "@/lib/dates";
import { PageHeader, IconButton } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { TripForm } from "@/components/trip/TripForm";
import type { Trip } from "@/lib/types";

export default function TripsPage() {
  return <Suspense><TripsInner /></Suspense>;
}

/** Запоминаем, где человек был, чтобы следующий запуск открывался сразу там. */
export const LAST_TRIP_KEY = "ot_last_trip";

/**
 * Куда прыгнуть вместо списка: единственная поездка или та, что открывали в прошлый раз.
 * `?all=1` отключает переход — так работает кнопка «Все поездки».
 */
function pickTrip(showAll: boolean, trips: Array<{ id: string }> | undefined): string | null {
  if (showAll || !trips?.length) return null;
  if (trips.length === 1) return trips[0].id;
  if (typeof localStorage === "undefined") return null;
  const last = localStorage.getItem(LAST_TRIP_KEY);
  return trips.find((t) => t.id === last)?.id ?? null;
}

function TripsInner() {
  const me = useMe();
  const sp = useSearchParams();
  const showAll = sp.get("all") === "1";
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Одна поездка или уже открытая раньше — заходим прямо в неё:
  // в походе лишний экран со списком только мешает.
  const jumpTo = pickTrip(showAll, me.data?.trips);

  useEffect(() => {
    if (jumpTo) router.replace(`/t/${jumpTo}`);
  }, [jumpTo, router]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    qc.clear();
    localStorage.removeItem(LAST_TRIP_KEY);
    router.replace("/");
    router.refresh();
  }

  const trips = me.data?.trips ?? [];

  if (jumpTo) {
    return (
      <main className="mx-auto max-w-lg px-5 pt-8">
        <div className="mb-5 h-8 w-2/3 rounded-lg skeleton" />
        <div className="h-36 rounded-card skeleton" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-28">
      <PageHeader
        title="Мои поездки"
        right={<IconButton label="Выйти" onClick={logout}><LogoutIcon /></IconButton>}
      />

      {me.isLoading && <div className="flex flex-col gap-2">{[0, 1].map((i) => <div key={i} className="h-24 rounded-card skeleton" />)}</div>}
      {me.isError && <div className="text-[14px] text-bad">{(me.error as Error).message}</div>}

      {me.isSuccess && !trips.length && (
        <EmptyState icon="🧭" title="Пока нет поездок" text="Создайте поездку или откройте ссылку-приглашение от организатора." action={<Button onClick={() => setOpen(true)}>Создать поездку</Button>} />
      )}

      <div className="flex flex-col gap-2">
        {trips.map((t) => (
          <TripCard key={t.id} trip={t} onClick={() => router.push(`/t/${t.id}`)} />
        ))}
      </div>

      {trips.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-10 mx-auto max-w-lg px-5" style={{ paddingBottom: "calc(20px + var(--safe-bottom))" }}>
          <Button size="lg" onClick={() => setOpen(true)}>Новая поездка</Button>
        </div>
      )}

      <TripForm open={open} onClose={() => setOpen(false)} onCreated={(t) => { setOpen(false); router.push(`/t/${t.id}`); }} />
    </main>
  );
}

function TripCard({ trip, onClick }: { trip: Trip & { role: string }; onClick: () => void }) {
  const phase = tripPhase(trip.start_date, trip.end_date);
  return (
    <Card className="cursor-pointer px-[18px] py-4 active:bg-surface-2" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-medium tracking-[-0.015em]">{trip.name}</div>
          <div className="mt-1 text-[13px] text-ink-2">{dateRange(trip.start_date, trip.end_date)}</div>
        </div>
        <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-medium ${phase.kind === "during" ? "bg-accent text-white" : phase.kind === "after" ? "bg-surface-2 text-ink-2" : "bg-inverse text-inverse-fg"}`}>
          {phaseLabel(phase)}
        </span>
      </div>
      {trip.role === "admin" && <div className="mt-2 text-[11px] font-medium text-accent">Вы организатор</div>}
    </Card>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

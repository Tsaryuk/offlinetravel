"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTrip } from "@/lib/client/hooks";
import { HttpError } from "@/lib/client/api";
import { TripProvider } from "@/components/trip/TripContext";
import { BottomNav } from "@/components/trip/BottomNav";
import { SwipeTabs } from "@/components/trip/SwipeTabs";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Button } from "@/components/ui/Button";

export default function TripLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const path = usePathname();
  const q = useTrip(id);

  const tabs = [`/t/${id}`, `/t/${id}/expenses`, `/t/${id}/places`, `/t/${id}/chat`, `/t/${id}/members`];

  if (q.isError && !q.data) {
    const err = q.error as Error;
    const status = err instanceof HttpError ? err.status : 0;
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="text-[18px] font-medium">{status === 403 ? "Вы не участник этой поездки" : status === 401 ? "Нужно войти" : "Не удалось загрузить"}</div>
        <div className="mt-2 text-[14px] text-ink-2">{err.message}</div>
        <Button className="mt-5" onClick={() => router.replace(status === 401 ? `/?next=/t/${id}` : "/trips")}>{status === 401 ? "Войти" : "К списку поездок"}</Button>
      </main>
    );
  }

  if (!q.data) {
    return (
      <main className="mx-auto max-w-lg px-5 pt-8">
        <div className="mb-5 h-8 w-2/3 rounded-lg skeleton" />
        <div className="mb-2 h-36 rounded-card skeleton" />
        <div className="mb-2 h-20 rounded-card skeleton" />
        <div className="h-20 rounded-card skeleton" />
      </main>
    );
  }

  return (
    <TripProvider bundle={q.data}>
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
        <SwipeTabs tabs={tabs} current={Math.max(0, tabs.indexOf(path))}>
          <main className="flex-1 px-5 pb-[calc(var(--nav-h)+var(--safe-bottom)+24px)]">
            <PullToRefresh>{children}</PullToRefresh>
          </main>
        </SwipeTabs>
        <BottomNav tripId={id} />
      </div>
    </TripProvider>
  );
}

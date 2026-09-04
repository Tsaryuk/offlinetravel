"use client";

import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTrip } from "@/lib/client/hooks";
import { HttpError } from "@/lib/client/api";
import { TripProvider } from "@/components/trip/TripContext";
import { Button } from "@/components/ui/Button";

export default function TripLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useTrip(id);

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

  return <TripProvider bundle={q.data}>{children}</TripProvider>;
}

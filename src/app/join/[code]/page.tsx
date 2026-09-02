"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, HttpError } from "@/lib/client/api";
import { Login } from "@/components/Login";
import type { Trip } from "@/lib/types";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [state, setState] = useState<"joining" | "login" | "error">("joining");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ trip: Trip }>("/api/trips/join", { method: "POST", body: { code } })
      .then(({ trip }) => {
        qc.invalidateQueries({ queryKey: ["me"] });
        router.replace(`/t/${trip.id}`);
      })
      .catch((e: Error) => {
        if (e instanceof HttpError && e.status === 401) setState("login");
        else {
          setError(e.message);
          setState("error");
        }
      });
  }, [code, qc, router]);

  if (state === "login") return <Login next={`/join/${code}`} />;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {state === "joining" ? (
        <>
          <div className="mb-4 h-3.5 w-3.5 animate-pulse rounded-full bg-accent" />
          <div className="text-[15px] text-ink-2">Присоединяем к поездке…</div>
        </>
      ) : (
        <>
          <div className="text-[18px] font-medium">Не получилось</div>
          <div className="mt-2 text-[14px] text-ink-2">{error}</div>
        </>
      )}
    </main>
  );
}

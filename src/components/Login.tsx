"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { initTelegram, rawInitData } from "@/lib/client/tma";
import { Button } from "@/components/ui/Button";

type Phase = "checking" | "idle" | "waiting" | "error";

export function Login({ next }: { next?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [botLink, setBotLink] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const target = next && next.startsWith("/") ? next : "/trips";

  const finish = useCallback(() => {
    router.replace(target);
    router.refresh();
  }, [router, target]);

  // Внутри Telegram: входим по initData автоматически, без кнопок.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      initTelegram();
      const raw = rawInitData();
      if (!raw) {
        if (!cancelled) setPhase("idle");
        return;
      }
      try {
        await api("/api/auth/telegram", { method: "POST", body: { initData: raw } });
        if (!cancelled) finish();
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        setPhase("idle");
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [finish]);

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  // В браузере: код → бот → опрос подтверждения.
  async function startBotLogin() {
    setError(null);
    try {
      const { code, link } = await api<{ code: string; link: string }>("/api/auth/code", { method: "POST" });
      setBotLink(link);
      setPhase("waiting");
      window.open(link, "_blank", "noopener");
      pollRef.current = window.setInterval(async () => {
        try {
          const r = await api<{ claimed: boolean }>(`/api/auth/code/${code}`);
          if (r.claimed) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            finish();
          }
        } catch (e) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setError((e as Error).message);
          setPhase("error");
        }
      }, 2000);
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8" style={{ paddingTop: "calc(24px + var(--safe-top))" }}>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-7 h-3.5 w-3.5 rounded-full bg-accent" style={{ animation: "fade-up .6s var(--ease-out) both" }} />
        <h1 className="mb-3.5 text-[44px] font-medium leading-none tracking-[-0.04em]" style={{ animation: "fade-up .6s var(--ease-out) .1s both" }}>
          Offline.<span className="text-accent">Travel</span>
        </h1>
        <p className="mb-9 max-w-[300px] text-[16px] leading-relaxed text-ink-2" style={{ animation: "fade-up .6s var(--ease-out) .2s both" }}>
          Координация поездки. Расписание, места, расходы — всё в одном месте.
        </p>

        <div style={{ animation: "fade-up .6s var(--ease-out) .3s both" }}>
          {phase === "checking" && <div className="h-14 w-full rounded-pill skeleton" />}
          {(phase === "idle" || phase === "error") && (
            <Button size="lg" onClick={startBotLogin}>
              <TgIcon /> Войти через Telegram
            </Button>
          )}
          {phase === "waiting" && (
            <div className="rounded-card bg-surface p-5 text-center">
              <div className="text-[15px] font-medium">Нажмите «Старт» в боте</div>
              <div className="mt-1 text-[13px] text-ink-2">Ждём подтверждение…</div>
              {botLink && (
                <a href={botLink} target="_blank" rel="noopener" className="mt-4 inline-flex h-10 items-center rounded-pill border border-line px-4 text-[13px] font-medium">
                  Открыть Telegram ещё раз
                </a>
              )}
            </div>
          )}
          {error && <div className="mt-3 text-[13px] text-bad">{error}</div>}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2" style={{ animation: "fade-up .6s var(--ease-out) .45s both" }}>
          {[
            ["📅", "Расписание", "По часам на каждый день"],
            ["💸", "Расходы", "Кто кому сколько должен"],
            ["📍", "Места", "Адреса и маршруты"],
            ["💬", "Чат", "Общение в группе"],
          ].map(([icon, label, sub]) => (
            <div key={label} className="flex flex-col gap-2 rounded-card bg-surface px-4 py-[18px]">
              <div className="text-[22px] leading-none">{icon}</div>
              <div className="text-[14.5px] font-medium tracking-[-0.01em]">{label}</div>
              <div className="text-[12px] leading-snug text-ink-2">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function TgIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.61c-.15.673-.544.838-1.101.52l-3.038-2.238-1.466 1.41c-.162.162-.298.298-.611.298l.217-3.084 5.613-5.07c.244-.217-.053-.337-.378-.12L7.06 14.46l-2.987-.94c-.66-.207-.673-.66.138-.977l10.877-4.193c.55-.2 1.031.134.474.898z" />
    </svg>
  );
}

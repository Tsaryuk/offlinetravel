"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripCtx } from "@/components/trip/TripContext";
import { IconButton } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AvatarStack } from "@/components/ui/Avatar";
import { ExpenseSheet } from "@/components/trip/ExpenseSheet";
import { ScheduleList } from "@/components/trip/ScheduleList";
import { TripForm } from "@/components/trip/TripForm";
import { fmtMoney } from "@/lib/money";
import { dateRange, daysBetween, localISO, phaseLabel, plural, tripPhase } from "@/lib/dates";
import { InviteSheet } from "@/components/trip/InviteSheet";
import { InstallGuide, isStandalone } from "@/components/InstallGuide";

export function HomeTab({ onGoTab }: { onGoTab: (index: number, sub?: "balance") => void }) {
  const t = useTripCtx();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editTrip, setEditTrip] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("ot_last_trip", t.trip.id); } catch { /* приватный режим */ }
  }, [t.trip.id]);

  const phase = tripPhase(t.trip.start_date, t.trip.end_date);
  const nDays = daysBetween(t.trip.start_date, t.trip.end_date) + 1;
  const myBal = Math.round(t.balances[t.me.tg_id] ?? 0);
  const total = useMemo(
    () => t.expenses.filter((e) => e.op_type === "expense").reduce((s, e) => s + t.inBase(e.amount, e.currency), 0),
    [t],
  );
  const cur = t.trip.base_currency;

  return (
    <>
      {/* Шапка поездки: цветной блок, задающий настроение экрану */}
      <section
        className="-mx-5 mb-4 px-5 pb-5"
        style={{
          paddingTop: "calc(20px + var(--safe-top))",
          background: phase.kind === "during"
            ? "linear-gradient(160deg, #fff3ec 0%, var(--color-bg) 78%)"
            : phase.kind === "after"
              ? "linear-gradient(160deg, var(--color-surface) 0%, var(--color-bg) 78%)"
              : "linear-gradient(160deg, #eef2fb 0%, var(--color-bg) 78%)",
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-[30px] font-medium leading-tight tracking-[-0.03em]">{t.trip.name}</h1>
          <div className="flex shrink-0 items-center gap-1 pt-1">
            {t.isAdmin && <IconButton label="Настройки поездки" onClick={() => setEditTrip(true)}><GearIcon /></IconButton>}
            <IconButton label="Все поездки" onClick={() => router.push("/trips?all=1")}><GridIcon /></IconButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-pill px-3 py-1.5 text-[12px] font-medium ${
            phase.kind === "during" ? "bg-accent text-white" : phase.kind === "after" ? "bg-surface-2 text-ink-2" : "bg-inverse text-inverse-fg"
          }`}>{phaseLabel(phase)}</span>
          <span className="rounded-pill bg-bg/70 px-3 py-1.5 text-[12px] font-medium text-ink-2">
            {dateRange(t.trip.start_date, t.trip.end_date)} · {nDays} {plural(nDays, "день", "дня", "дней")}
          </span>
        </div>

        {t.trip.description && <p className="mt-3 text-[14px] leading-snug text-ink-2">{t.trip.description}</p>}

        <button type="button" onClick={() => setInviteOpen(true)} className="mt-4 flex w-full items-center gap-3 rounded-card bg-bg/70 px-4 py-3 text-left active:bg-bg">
          <AvatarStack members={t.members} size={30} />
          <span className="flex-1 text-[13.5px] text-ink-2">{t.members.length} {plural(t.members.length, "участник", "участника", "участников")}</span>
          <span className="text-[13px] font-medium text-accent">Пригласить</span>
        </button>
      </section>

      {/* Деньги: два цветных блока, крупные цифры */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onGoTab(1)} className="rounded-card bg-surface px-[18px] pb-4 pt-[18px] text-left active:bg-surface-2">
          <div className="tabular text-[26px] font-medium leading-none tracking-[-0.03em]">{fmtMoney(total, cur)}</div>
          <div className="mt-2 text-[12px] font-medium text-ink-2">Потрачено всего</div>
        </button>
        <button
          type="button"
          onClick={() => onGoTab(1, "balance")}
          className="rounded-card px-[18px] pb-4 pt-[18px] text-left transition active:brightness-95"
          style={{ background: myBal > 0 ? "var(--color-good-soft)" : myBal < 0 ? "var(--color-bad-soft)" : "var(--color-surface)" }}
        >
          <div className={`tabular text-[26px] font-medium leading-none tracking-[-0.03em] ${myBal > 0 ? "text-good" : myBal < 0 ? "text-bad" : ""}`}>
            {myBal === 0 ? "Ровно" : fmtMoney(myBal, cur, { sign: true })}
          </div>
          <div className="mt-2 text-[12px] font-medium text-ink-2">{myBal > 0 ? "Вам должны" : myBal < 0 ? "Вы должны" : "Долгов нет"}</div>
        </button>
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-accent text-[16px] font-medium text-white active:scale-[.98]"
      >
        ＋ Добавить расход
      </button>

      <GearCard />

      <div className="mb-2.5 mt-6 flex items-baseline justify-between">
        <h2 className="text-[17px] font-medium tracking-[-0.02em]">Расписание</h2>
        <span className="text-[12px] text-ink-2">{t.schedule.length} {plural(t.schedule.length, "событие", "события", "событий")}</span>
      </div>
      <ScheduleList initialDay={phase.kind === "during" ? localISO() : t.trip.start_date} />

      <InstallBanner onOpen={() => setInstallOpen(true)} />

      <ExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <InstallGuide open={installOpen} onClose={() => setInstallOpen(false)} />
      {t.isAdmin && editTrip && <TripForm open onClose={() => setEditTrip(false)} trip={t.trip} />}
    </>
  );
}

/** Ненавязчивая подсказка про установку — прячется, если уже установлено или скрыто. */
function InstallBanner({ onOpen }: { onOpen: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      if (isStandalone()) return;
      if (localStorage.getItem("ot_install_hidden") === "1") return;
      setShow(true);
    });
  }, []);
  if (!show) return null;
  return (
    <Card className="mt-4 flex items-center gap-3 px-[18px] py-3.5">
      <div className="text-[18px]">📲</div>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <div className="text-[14px] font-medium">Поставить на экран телефона</div>
        <div className="mt-0.5 text-[12.5px] text-ink-2">Чтобы работало без связи в походе</div>
      </button>
      <button type="button" aria-label="Скрыть" className="shrink-0 px-2 text-[16px] text-ink-3" onClick={() => { localStorage.setItem("ot_install_hidden", "1"); setShow(false); }}>×</button>
    </Card>
  );
}

function GearCard() {
  const t = useTripCtx();
  const router = useRouter();
  const total = t.gear.length;
  const packed = t.gear.filter((g) => g.done).length;
  const free = t.gear.filter((g) => !g.assignee).length;
  const progress = total ? Math.round((packed / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => router.push(`/t/${t.trip.id}/gear`)}
      className="mt-2 flex w-full items-center gap-3.5 rounded-card bg-surface px-[18px] py-4 text-left active:bg-surface-2"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg text-[20px]">🎒</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-medium tracking-[-0.01em]">Снаряжение</span>
          {total > 0 && <span className="tabular shrink-0 text-[12px] text-ink-2">{packed}/{total}</span>}
        </div>
        {total > 0 ? (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
              <div className="h-full rounded-full bg-good transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {free > 0 && <div className="mt-1.5 text-[12px] text-bad">{free} без хозяина</div>}
          </>
        ) : (
          <div className="mt-0.5 text-[12.5px] text-ink-2">Список пуст — кто что берёт?</div>
        )}
      </div>
      <div className="text-[18px] text-ink-3">›</div>
    </button>
  );
}

function GearIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
}
function GridIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}

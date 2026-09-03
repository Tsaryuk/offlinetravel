"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripCtx } from "@/components/trip/TripContext";
import { PageHeader, IconButton } from "@/components/ui/PageHeader";
import { Card, StatTile, SectionTitle } from "@/components/ui/Card";
import { AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ExpenseSheet } from "@/components/trip/ExpenseSheet";
import { ScheduleList } from "@/components/trip/ScheduleList";
import { TripForm } from "@/components/trip/TripForm";
import { fmtMoney } from "@/lib/money";
import { dateRange, daysBetween, localISO, phaseLabel, plural, tripPhase } from "@/lib/dates";
import { InviteSheet } from "@/components/trip/InviteSheet";
import { InstallGuide, isStandalone } from "@/components/InstallGuide";

export default function HomePage() {
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
      <PageHeader
        title={t.trip.name}
        right={
          <>
            {t.isAdmin && <IconButton label="Настройки поездки" onClick={() => setEditTrip(true)}><GearIcon /></IconButton>}
            <IconButton label="Все поездки" onClick={() => router.push("/trips?all=1")}><GridIcon /></IconButton>
          </>
        }
      />

      <Card className="p-[18px]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[15px] text-ink-2">
            {dateRange(t.trip.start_date, t.trip.end_date)} · {nDays} {plural(nDays, "день", "дня", "дней")}
          </div>
          <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-medium ${phase.kind === "during" ? "bg-accent text-white" : phase.kind === "after" ? "bg-surface-2 text-ink-2" : "bg-inverse text-inverse-fg"}`}>
            {phaseLabel(phase)}
          </span>
        </div>
        {t.trip.description && <div className="mt-2 text-[14px] leading-snug text-ink-2">{t.trip.description}</div>}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarStack members={t.members} />
            <span className="text-[13px] text-ink-2">{t.members.length} {plural(t.members.length, "участник", "участника", "участников")}</span>
          </div>
          <button type="button" className="text-[13px] font-medium underline underline-offset-4" onClick={() => setInviteOpen(true)}>Пригласить</button>
        </div>
      </Card>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <StatTile value={fmtMoney(total, cur)} label="Потрачено всего" onClick={() => router.push(`/t/${t.trip.id}/expenses`)} />
        <StatTile
          value={myBal === 0 ? "0 " + fmtMoney(0, cur).slice(-1) : fmtMoney(myBal, cur, { sign: true })}
          label={myBal > 0 ? "Вам должны" : myBal < 0 ? "Вы должны" : "Всё ровно"}
          tone={myBal > 0 ? "good" : myBal < 0 ? "bad" : undefined}
          onClick={() => router.push(`/t/${t.trip.id}/expenses?tab=balance`)}
        />
      </div>

      <div className="mt-2 flex gap-2">
        <Button size="lg" onClick={() => setAddOpen(true)}>＋ Расход</Button>
        <Button size="lg" variant="ghost" onClick={() => router.push(`/t/${t.trip.id}/expenses?tab=balance`)}>Долги</Button>
      </div>

      <GearCard />

      <SectionTitle className="mt-7">Расписание</SectionTitle>
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
    <Card className="mt-2 flex items-center gap-3 px-[18px] py-3.5">
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
  const assigned = t.gear.filter((g) => g.assignee).length;
  const packed = t.gear.filter((g) => g.done).length;
  const sub = !total ? "Список пуст — кто что берёт?" : `${assigned} из ${total} распределено · ${packed} собрано`;
  return (
    <Card className="mt-2 flex cursor-pointer items-center gap-3.5 px-[18px] py-4 active:bg-surface-2" onClick={() => router.push(`/t/${t.trip.id}/gear`)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-[18px]">🎒</div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em]">Снаряжение</div>
        <div className="mt-0.5 text-[12.5px] text-ink-2">{sub}</div>
      </div>
      <div className="text-[18px] text-ink-3">›</div>
    </Card>
  );
}

function GearIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
}
function GridIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}

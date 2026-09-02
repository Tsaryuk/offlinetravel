"use client";

import { useMemo, useState } from "react";
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
import { toBase } from "@/lib/balances";
import { shareInvite } from "@/lib/client/share";

export default function HomePage() {
  const t = useTripCtx();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editTrip, setEditTrip] = useState(false);

  const phase = tripPhase(t.trip.start_date, t.trip.end_date);
  const nDays = daysBetween(t.trip.start_date, t.trip.end_date) + 1;
  const myBal = Math.round(t.balances[t.me.tg_id] ?? 0);
  const total = useMemo(
    () => t.expenses.filter((e) => e.op_type === "expense").reduce((s, e) => s + toBase(e.amount, e.currency, t.trip.base_currency, {}), 0),
    [t.expenses, t.trip.base_currency],
  );
  const cur = t.trip.base_currency;

  return (
    <>
      <PageHeader
        title={t.trip.name}
        right={
          <>
            {t.isAdmin && <IconButton label="Настройки поездки" onClick={() => setEditTrip(true)}><GearIcon /></IconButton>}
            <IconButton label="Все поездки" onClick={() => router.push("/trips")}><GridIcon /></IconButton>
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
          <button type="button" className="text-[13px] font-medium underline underline-offset-4" onClick={() => shareInvite(t.trip.name, t.trip.invite_code)}>Пригласить</button>
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

      <SectionTitle className="mt-7">Расписание</SectionTitle>
      <ScheduleList initialDay={phase.kind === "during" ? localISO() : t.trip.start_date} />

      <ExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />
      {t.isAdmin && editTrip && <TripForm open onClose={() => setEditTrip(false)} trip={t.trip} />}
    </>
  );
}

function GearIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
}
function GridIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}

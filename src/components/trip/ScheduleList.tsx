"use client";

import { useState } from "react";
import { useTripCtx } from "./TripContext";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EventForm } from "./EventForm";
import { dayLabel, localISO, timeShort, tripDays } from "@/lib/dates";
import type { ScheduleEvent } from "@/lib/types";

export function ScheduleList({ initialDay }: { initialDay: string }) {
  const t = useTripCtx();
  const days = tripDays(t.trip.start_date, t.trip.end_date);
  const [day, setDay] = useState(days.includes(initialDay) ? initialDay : days[0]);
  const [form, setForm] = useState<{ open: boolean; event?: ScheduleEvent }>({ open: false });

  const events = t.schedule.filter((e) => e.day === day);
  const now = new Date();
  const isToday = day === localISO(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const mins = (s: string | null) => (s ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : null);

  return (
    <>
      <ChipRow className="mb-4">{days.map((d) => <Chip key={d} on={d === day} onClick={() => setDay(d)}>{dayLabel(d)}</Chip>)}</ChipRow>

      {!events.length ? (
        <EmptyState icon="📅" title="Нет событий" text={t.isAdmin ? "Добавьте первое событие дня." : "Организатор скоро добавит расписание."} action={t.isAdmin && <Button size="sm" onClick={() => setForm({ open: true })}>Добавить событие</Button>} />
      ) : (
        <div>
          {events.map((e) => {
            const start = mins(e.time_start) ?? 0;
            const end = mins(e.time_end) ?? start + 60;
            const isNow = isToday && nowMins >= start && nowMins < end;
            const past = isToday && nowMins >= end;
            const place = e.place_id ? t.places.find((p) => p.id === e.place_id) : null;
            return (
              <div key={e.id} className={`relative flex gap-4 border-b border-line py-4 last:border-b-0 ${isNow ? "-mx-5 rounded-card border-b-0 bg-surface px-5" : ""} ${past ? "opacity-45" : ""}`}>
                <div className={`tabular w-[52px] shrink-0 pt-0.5 text-[14px] font-medium ${isNow ? "text-accent" : ""}`}>{timeShort(e.time_start)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-medium tracking-[-0.01em]">
                    {e.title}
                    {isNow && <span className="ml-2 rounded-pill bg-accent px-2 py-0.5 align-middle text-[10px] font-medium text-white">Сейчас</span>}
                  </div>
                  {e.description && <div className="mt-0.5 text-[13.5px] leading-snug text-ink-2">{e.description}</div>}
                  {place && <div className="mt-1.5 flex items-center gap-1 text-[13px] font-medium"><PinIcon />{place.name}</div>}
                </div>
                {t.isAdmin && (
                  <button type="button" aria-label="Изменить" onClick={() => setForm({ open: true, event: e })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-[12px]">✎</button>
                )}
              </div>
            );
          })}
          {t.isAdmin && <Button variant="ghost" size="sm" className="mt-4" onClick={() => setForm({ open: true })}>＋ Событие</Button>}
        </div>
      )}

      {form.open && <EventForm open onClose={() => setForm({ open: false })} event={form.event} defaultDay={day} />}
    </>
  );
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ff5a00" strokeWidth="2" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>;
}

"use client";

import { useState } from "react";
import { useTripCtx } from "./TripContext";
import { useTripMutation } from "@/lib/client/hooks";
import { api } from "@/lib/client/api";
import { Sheet, Confirm } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { dayLabel, tripDays } from "@/lib/dates";
import type { ScheduleEvent } from "@/lib/types";

export function EventForm({ open, onClose, event, defaultDay }: { open: boolean; onClose: () => void; event?: ScheduleEvent; defaultDay: string }) {
  const t = useTripCtx();
  const [day, setDay] = useState(event?.day ?? defaultDay);
  const [start, setStart] = useState(event?.time_start?.slice(0, 5) ?? "09:00");
  const [end, setEnd] = useState(event?.time_end?.slice(0, 5) ?? "");
  const [title, setTitle] = useState(event?.title ?? "");
  const [desc, setDesc] = useState(event?.description ?? "");
  const [placeId, setPlaceId] = useState(event?.place_id ?? "");
  const [confirmDel, setConfirmDel] = useState(false);

  const save = useTripMutation(t.trip.id, (body: object) =>
    event ? api(`/api/trips/${t.trip.id}/schedule/${event.id}`, { method: "PATCH", body }) : api(`/api/trips/${t.trip.id}/schedule`, { method: "POST", body }),
  );
  const del = useTripMutation(t.trip.id, () => api(`/api/trips/${t.trip.id}/schedule/${event!.id}`, { method: "DELETE" }));

  async function submit() {
    if (!title.trim()) return toast("Введите название", "error");
    try {
      await save.mutateAsync({ day, time_start: start, time_end: end || null, title, description: desc || null, place_id: placeId || null });
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={event ? "Событие" : "Новое событие"}>
      <FieldGroup label="День">
        <Select value={day} onChange={(e) => setDay(e.target.value)}>{tripDays(t.trip.start_date, t.trip.end_date).map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}</Select>
      </FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <FieldGroup label="Начало"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></FieldGroup>
        <FieldGroup label="Конец"><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></FieldGroup>
      </div>
      <FieldGroup label="Название"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Переход до Радонежа" /></FieldGroup>
      <FieldGroup label="Описание"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="22 км, обед на привале" /></FieldGroup>
      <FieldGroup label="Место">
        <Select value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
          <option value="">Без привязки к месту</option>
          {t.places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </FieldGroup>
      <Button size="lg" onClick={submit} loading={save.isPending} className="mt-2">Сохранить</Button>
      {event && <Button size="lg" variant="ghost" className="mt-2 text-bad" onClick={() => setConfirmDel(true)}>Удалить</Button>}
      <Confirm open={confirmDel} title="Удалить событие?" danger confirmLabel="Удалить" onCancel={() => setConfirmDel(false)} onConfirm={async () => { setConfirmDel(false); await del.mutateAsync(undefined); onClose(); }} />
    </Sheet>
  );
}

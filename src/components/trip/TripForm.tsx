"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import { localISO } from "@/lib/dates";
import { CURRENCIES, type Trip } from "@/lib/types";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Textarea } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { toast } from "@/components/ui/Toast";

export function TripForm({ open, onClose, onCreated, trip }: { open: boolean; onClose: () => void; onCreated?: (t: Trip) => void; trip?: Trip }) {
  const qc = useQueryClient();
  const [name, setName] = useState(trip?.name ?? "");
  const [start, setStart] = useState(trip?.start_date ?? localISO());
  const [end, setEnd] = useState(trip?.end_date ?? localISO());
  const [cur, setCur] = useState<string>(trip?.base_currency ?? "RUB");
  const [desc, setDesc] = useState(trip?.description ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return toast("Введите название", "error");
    if (end < start) return toast("Дата окончания раньше начала", "error");
    setBusy(true);
    try {
      const body = { name, start_date: start, end_date: end, base_currency: cur, description: desc || null };
      if (trip) {
        await api(`/api/trips/${trip.id}`, { method: "PATCH", body });
        qc.invalidateQueries({ queryKey: ["trip", trip.id] });
        onClose();
      } else {
        const { trip: created } = await api<{ trip: Trip }>("/api/trips", { method: "POST", body });
        qc.invalidateQueries({ queryKey: ["me"] });
        onCreated?.(created);
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={trip ? "Поездка" : "Новая поездка"}>
      <FieldGroup label="Название"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Дорога в Лавру" autoFocus /></FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <FieldGroup label="Начало"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></FieldGroup>
        <FieldGroup label="Окончание"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></FieldGroup>
      </div>
      <FieldGroup label="Базовая валюта">
        <ChipRow>{CURRENCIES.map((c) => <Chip key={c} on={cur === c} onClick={() => setCur(c)}>{c}</Chip>)}</ChipRow>
      </FieldGroup>
      <FieldGroup label="Описание"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Пеший поход, старт в 8:00 от вокзала" /></FieldGroup>
      <Button size="lg" onClick={save} loading={busy} className="mt-2">{trip ? "Сохранить" : "Создать"}</Button>
    </Sheet>
  );
}

"use client";

import { useState } from "react";
import { useTripCtx } from "./TripContext";
import { useTripMutation } from "@/lib/client/hooks";
import { api } from "@/lib/client/api";
import { Sheet, Confirm } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Textarea } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { toast } from "@/components/ui/Toast";
import { PLACE_CATEGORIES, type Place } from "@/lib/types";

export function PlaceForm({ open, onClose, place }: { open: boolean; onClose: () => void; place?: Place }) {
  const t = useTripCtx();
  const [name, setName] = useState(place?.name ?? "");
  const [addr, setAddr] = useState(place?.address ?? "");
  const [cat, setCat] = useState(place?.category ?? "other");
  const [desc, setDesc] = useState(place?.description ?? "");
  const [mapUrl, setMapUrl] = useState(place?.map_url ?? "");
  const [photo, setPhoto] = useState(place?.photo_url ?? "");
  const [lat, setLat] = useState(place?.lat?.toString() ?? "");
  const [lng, setLng] = useState(place?.lng?.toString() ?? "");
  const [confirmDel, setConfirmDel] = useState(false);

  const save = useTripMutation(t.trip.id, (body: object) =>
    place ? api(`/api/trips/${t.trip.id}/places/${place.id}`, { method: "PATCH", body }) : api(`/api/trips/${t.trip.id}/places`, { method: "POST", body }),
  );
  const del = useTripMutation(t.trip.id, () => api(`/api/trips/${t.trip.id}/places/${place!.id}`, { method: "DELETE" }));

  async function submit() {
    if (!name.trim()) return toast("Введите название", "error");
    try {
      await save.mutateAsync({
        name, address: addr || null, category: cat, description: desc || null,
        map_url: mapUrl || null, photo_url: photo || null,
        lat: lat ? Number(lat.replace(",", ".")) : null, lng: lng ? Number(lng.replace(",", ".")) : null,
        sort_order: place?.sort_order ?? t.places.length,
      });
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={place ? "Место" : "Новое место"} full>
      <FieldGroup label="Название"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ночёвка у Радонежа" /></FieldGroup>
      <FieldGroup label="Адрес или ориентир"><Input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Радонеж, у источника" /></FieldGroup>
      <FieldGroup label="Категория">
        <ChipRow className="flex-wrap">{PLACE_CATEGORIES.map((c) => <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>{c.icon} {c.label}</Chip>)}</ChipRow>
      </FieldGroup>
      <FieldGroup label="Описание"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Вода в источнике, дрова взять с собой" /></FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <FieldGroup label="Широта"><Input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="56.2380" /></FieldGroup>
        <FieldGroup label="Долгота"><Input inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="38.0480" /></FieldGroup>
      </div>
      <FieldGroup label="Ссылка на карту"><Input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://yandex.ru/maps/…" inputMode="url" /></FieldGroup>
      <FieldGroup label="Фото (ссылка)"><Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" inputMode="url" /></FieldGroup>
      <Button size="lg" onClick={submit} loading={save.isPending} className="mt-2">Сохранить</Button>
      {place && <Button size="lg" variant="ghost" className="mt-2 text-bad" onClick={() => setConfirmDel(true)}>Удалить</Button>}
      <Confirm open={confirmDel} title="Удалить место?" danger confirmLabel="Удалить" onCancel={() => setConfirmDel(false)} onConfirm={async () => { setConfirmDel(false); await del.mutateAsync(undefined); onClose(); }} />
    </Sheet>
  );
}

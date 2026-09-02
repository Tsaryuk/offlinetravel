"use client";

import { useState } from "react";
import { useTripCtx } from "@/components/trip/TripContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { Card, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlaceForm } from "@/components/trip/PlaceForm";
import { PLACE_CATEGORIES, type Place } from "@/lib/types";

export default function PlacesPage() {
  const t = useTripCtx();
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<{ open: boolean; place?: Place }>({ open: false });
  const list = filter === "all" ? t.places : t.places.filter((p) => p.category === filter);
  const usedCats = PLACE_CATEGORIES.filter((c) => t.places.some((p) => p.category === c.id));

  return (
    <>
      <PageHeader title="Места" />
      {usedCats.length > 1 && (
        <ChipRow className="mb-5">
          <Chip on={filter === "all"} onClick={() => setFilter("all")}>Все</Chip>
          {usedCats.map((c) => <Chip key={c.id} on={filter === c.id} onClick={() => setFilter(c.id)}>{c.icon} {c.label}</Chip>)}
        </ChipRow>
      )}

      {!list.length && <EmptyState icon="📍" title="Нет мест" text={t.isAdmin ? "Добавьте ночёвки, точки сбора, магазины и родники." : "Организатор добавит адреса и точки маршрута."} action={t.isAdmin && <Button size="sm" onClick={() => setForm({ open: true })}>Добавить место</Button>} />}

      <div className="flex flex-col gap-2.5">
        {list.map((p) => {
          const cat = PLACE_CATEGORIES.find((c) => c.id === p.category) ?? PLACE_CATEGORIES[PLACE_CATEGORIES.length - 1];
          return (
            <Card key={p.id} className="relative overflow-hidden">
              {p.photo_url && <img src={p.photo_url} alt="" className="h-44 w-full object-cover" loading="lazy" />}
              {t.isAdmin && <button type="button" aria-label="Изменить" onClick={() => setForm({ open: true, place: p })} className="absolute right-2.5 top-2.5 z-[1] flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[13px] text-white backdrop-blur">✎</button>}
              <div className="px-[18px] pb-4 pt-[18px]">
                <div className="text-[17px] font-medium tracking-[-0.015em]">{p.name}</div>
                {p.address && <div className="mt-1 text-[13.5px] text-ink-2">{p.address}</div>}
                {p.description && <div className="mt-2 text-[14px] leading-snug text-ink-2">{p.description}</div>}
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-pill border border-line px-2.5 py-1 text-[12px] font-medium text-ink-2">{cat.icon} {cat.label}</span>
                  {(p.map_url || (p.lat && p.lng) || p.address) && (
                    <a href={routeUrl(p)} target="_blank" rel="noopener" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-pill bg-inverse px-3.5 text-[13px] font-medium text-inverse-fg">
                      <RouteIcon /> Маршрут
                    </a>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {t.isAdmin && list.length > 0 && (
        <div className="fixed right-5 z-[45]" style={{ bottom: "calc(var(--nav-h) + var(--safe-bottom) + 18px)" }}>
          <button type="button" aria-label="Добавить место" onClick={() => setForm({ open: true })} className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[28px] font-light text-white transition active:scale-95">+</button>
        </div>
      )}

      {form.open && <PlaceForm open onClose={() => setForm({ open: false })} place={form.place} />}
    </>
  );
}

function routeUrl(p: Place): string {
  if (p.map_url) return p.map_url;
  if (p.lat && p.lng) return `https://yandex.ru/maps/?rtext=~${p.lat},${p.lng}&rtt=pd`;
  return `https://yandex.ru/maps/?text=${encodeURIComponent(p.address ?? p.name)}`;
}

function RouteIcon() {
  return <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
}

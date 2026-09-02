"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTripCtx } from "@/components/trip/TripContext";
import { useTripMutation } from "@/lib/client/hooks";
import { api } from "@/lib/client/api";
import { haptic } from "@/lib/client/tma";
import { PageHeader, IconButton } from "@/components/ui/PageHeader";
import { Card, EmptyState, SectionTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Sheet, Confirm } from "@/components/ui/Sheet";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { toast } from "@/components/ui/Toast";
import type { GearItem } from "@/lib/types";

const SUGGESTIONS = ["Палатка", "Котелок", "Горелка и газ", "Аптечка", "Топор", "Спички и зажигалка", "Тент", "Верёвка", "Пауэрбанк", "Карта и компас"];

export default function GearPage() {
  const t = useTripCtx();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [edit, setEdit] = useState<GearItem | null>(null);

  const add = useTripMutation(t.trip.id, (body: object) => api(`/api/trips/${t.trip.id}/gear`, { method: "POST", body }));
  const patch = useTripMutation(t.trip.id, (v: { id: string; body: object }) => api(`/api/trips/${t.trip.id}/gear/${v.id}`, { method: "PATCH", body: v.body }));

  async function submit(text = title) {
    const v = text.trim();
    if (!v) return;
    setTitle("");
    try {
      await add.mutateAsync({ title: v, sort_order: t.gear.length });
      haptic("light");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const mine = t.gear.filter((g) => g.assignee === t.me.tg_id);
  const free = t.gear.filter((g) => !g.assignee);
  const others = t.gear.filter((g) => g.assignee && g.assignee !== t.me.tg_id);
  const used = new Set(t.gear.map((g) => g.title.toLowerCase()));

  return (
    <>
      <PageHeader title="Снаряжение" sub={t.gear.length ? `${t.gear.filter((g) => g.done).length} из ${t.gear.length} собрано` : "Кто что несёт"} right={<IconButton label="Назад" onClick={() => router.back()}><BackIcon /></IconButton>} />

      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Что нужно взять" className="min-w-0 flex-1" />
        <Button type="submit" className="shrink-0" loading={add.isPending}>Добавить</Button>
      </form>
      {t.gear.length < 8 && (
        <ChipRow className="mb-5">
          {SUGGESTIONS.filter((s) => !used.has(s.toLowerCase())).slice(0, 6).map((s) => <Chip key={s} onClick={() => submit(s)}>＋ {s}</Chip>)}
        </ChipRow>
      )}

      {!t.gear.length && <EmptyState icon="🎒" title="Список пуст" text="Добавьте, что нужно взять, и распределите между участниками." />}

      {free.length > 0 && (<><SectionTitle>Никто не взял</SectionTitle><List items={free} onTake={(g) => patch.mutate({ id: g.id, body: { assignee: t.me.tg_id } })} onOpen={setEdit} /></>)}
      {mine.length > 0 && (<><SectionTitle>Несу я</SectionTitle><List items={mine} onToggle={(g) => patch.mutate({ id: g.id, body: { done: !g.done } })} onOpen={setEdit} /></>)}
      {others.length > 0 && (<><SectionTitle>У других</SectionTitle><List items={others} onOpen={setEdit} /></>)}

      {edit && <GearSheet item={t.gear.find((g) => g.id === edit.id) ?? edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function List({ items, onTake, onToggle, onOpen }: { items: GearItem[]; onTake?: (g: GearItem) => void; onToggle?: (g: GearItem) => void; onOpen: (g: GearItem) => void }) {
  const t = useTripCtx();
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((g) => (
        <Card key={g.id} className="flex items-center gap-3 px-4 py-3">
          {onToggle ? (
            <input type="checkbox" checked={g.done} onChange={() => onToggle(g)} className="h-5 w-5 accent-black" aria-label="Собрано" />
          ) : g.assignee ? (
            <Avatar member={t.membersById.get(g.assignee)} size={28} />
          ) : (
            <div className="h-7 w-7 rounded-full border border-dashed border-line" />
          )}
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(g)}>
            <div className={`truncate text-[15px] font-medium ${g.done ? "line-through text-ink-3" : ""}`}>{g.title}{g.qty ? <span className="ml-1.5 text-[13px] font-normal text-ink-2">× {g.qty}</span> : null}</div>
            {g.assignee && !onToggle && <div className="text-[12px] text-ink-2">{t.name(g.assignee)}</div>}
          </button>
          {onTake && <button type="button" onClick={() => onTake(g)} className="h-8 shrink-0 rounded-pill bg-inverse px-3.5 text-[12px] font-medium text-inverse-fg active:scale-95">Беру</button>}
        </Card>
      ))}
    </div>
  );
}

function GearSheet({ item, onClose }: { item: GearItem; onClose: () => void }) {
  const t = useTripCtx();
  const [title, setTitle] = useState(item.title);
  const [qty, setQty] = useState(item.qty ?? "");
  const [assignee, setAssignee] = useState<number | null>(item.assignee);
  const [confirm, setConfirm] = useState(false);
  const save = useTripMutation(t.trip.id, (body: object) => api(`/api/trips/${t.trip.id}/gear/${item.id}`, { method: "PATCH", body }));
  const del = useTripMutation(t.trip.id, () => api(`/api/trips/${t.trip.id}/gear/${item.id}`, { method: "DELETE" }));

  return (
    <Sheet open onClose={onClose} title="Предмет">
      <div className="mb-3 flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-0 flex-1" />
        <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Кол-во" className="w-[92px] shrink-0" />
      </div>
      <div className="mb-1.5 text-[12px] font-medium text-ink-2">Кто несёт</div>
      <ChipRow className="mb-5 flex-wrap">
        <Chip on={assignee === null} onClick={() => setAssignee(null)}>Никто</Chip>
        {t.members.map((m) => <Chip key={m.tg_id} on={assignee === m.tg_id} onClick={() => setAssignee(m.tg_id)}>{t.name(m.tg_id)}</Chip>)}
      </ChipRow>
      <Button size="lg" loading={save.isPending} onClick={async () => { try { await save.mutateAsync({ title, qty: qty || null, assignee }); onClose(); } catch (e) { toast((e as Error).message, "error"); } }}>Сохранить</Button>
      <Button size="lg" variant="ghost" className="mt-2 text-bad" onClick={() => setConfirm(true)}>Удалить</Button>
      <Confirm open={confirm} title="Удалить из списка?" danger confirmLabel="Удалить" onCancel={() => setConfirm(false)} onConfirm={async () => { setConfirm(false); await del.mutateAsync(undefined); onClose(); }} />
    </Sheet>
  );
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>;
}

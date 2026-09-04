"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTripCtx } from "@/components/trip/TripContext";
import { useTripMutation } from "@/lib/client/hooks";
import { api } from "@/lib/client/api";
import { haptic } from "@/lib/client/tma";
import { Card, EmptyState } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Sheet, Confirm } from "@/components/ui/Sheet";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { toast } from "@/components/ui/Toast";
import type { GearItem } from "@/lib/types";

const SUGGESTIONS = ["Палатка", "Котелок", "Горелка и газ", "Аптечка", "Топор", "Спички", "Тент", "Верёвка", "Пауэрбанк", "Карта"];

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
  const packed = t.gear.filter((g) => g.done).length;
  const progress = t.gear.length ? Math.round((packed / t.gear.length) * 100) : 0;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pb-10">
      <div className="sticky top-0 z-10 -mx-5 flex items-center gap-3 bg-bg px-5 pb-3 pt-5" style={{ paddingTop: "calc(20px + var(--safe-top))" }}>
        <button type="button" aria-label="Назад" onClick={() => router.push(`/t/${t.trip.id}`)} className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 active:scale-95">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="flex-1 text-[26px] font-medium leading-none tracking-[-0.03em]">Снаряжение</h1>
      </div>

      {t.gear.length > 0 && (
        <Card className="mb-4 px-[18px] py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[14px] font-medium">Собрано {packed} из {t.gear.length}</span>
            <span className="tabular text-[13px] text-ink-2">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-good transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {free.length > 0 && <div className="mt-2.5 text-[12.5px] text-bad">{free.length} без хозяина</div>}
        </Card>
      )}

      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Что нужно взять" className="min-w-0 flex-1" />
        <Button type="submit" className="shrink-0" loading={add.isPending}>Добавить</Button>
      </form>

      {t.gear.length < 8 && (
        <ChipRow className="mb-5 -mx-5 px-5">
          {SUGGESTIONS.filter((s) => !used.has(s.toLowerCase())).slice(0, 6).map((s) => <Chip key={s} onClick={() => submit(s)}>＋ {s}</Chip>)}
        </ChipRow>
      )}

      {!t.gear.length && <EmptyState icon="🎒" title="Список пуст" text="Добавьте, что нужно взять, и разберите между собой." />}

      <Group title="Никто не взял" tone="bad" count={free.length}>
        <List items={free} onTake={(g) => patch.mutate({ id: g.id, body: { assignee: t.me.tg_id } })} onOpen={setEdit} />
      </Group>
      <Group title="Несу я" tone="accent" count={mine.length}>
        <List items={mine} onToggle={(g) => patch.mutate({ id: g.id, body: { done: !g.done } })} onOpen={setEdit} />
      </Group>
      <Group title="У других" count={others.length}>
        <List items={others} onOpen={setEdit} />
      </Group>

      {edit && <GearSheet item={t.gear.find((g) => g.id === edit.id) ?? edit} onClose={() => setEdit(null)} />}
    </main>
  );
}

function Group({ title, count, tone, children }: { title: string; count: number; tone?: "bad" | "accent"; children: React.ReactNode }) {
  if (!count) return null;
  const color = tone === "bad" ? "text-bad" : tone === "accent" ? "text-accent" : "text-ink-2";
  return (
    <section className="mb-5">
      <div className={`mb-2 flex items-center gap-2 text-[12px] font-medium ${color}`}>
        <span>{title}</span>
        <span className="rounded-pill bg-surface px-1.5 py-0.5 text-[11px] text-ink-2">{count}</span>
      </div>
      {children}
    </section>
  );
}

function List({ items, onTake, onToggle, onOpen }: { items: GearItem[]; onTake?: (g: GearItem) => void; onToggle?: (g: GearItem) => void; onOpen: (g: GearItem) => void }) {
  const t = useTripCtx();
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((g) => (
        <Card key={g.id} className="flex items-center gap-3 px-4 py-3">
          {onToggle ? (
            <input type="checkbox" checked={g.done} onChange={() => onToggle(g)} className="h-5 w-5 shrink-0 accent-black" aria-label={`${g.title} собрано`} />
          ) : g.assignee ? (
            <Avatar member={t.membersById.get(g.assignee)} size={30} />
          ) : (
            <div className="h-[30px] w-[30px] shrink-0 rounded-full border border-dashed border-ink-3" />
          )}
          <button type="button" className="min-w-0 flex-1 py-0.5 text-left" onClick={() => onOpen(g)}>
            <div className={`truncate text-[15px] font-medium ${g.done ? "text-ink-3 line-through" : ""}`}>
              {g.title}
              {g.qty ? <span className="ml-1.5 text-[13px] font-normal text-ink-2">× {g.qty}</span> : null}
            </div>
            {g.assignee && !onToggle && <div className="mt-0.5 text-[12px] text-ink-2">{t.name(g.assignee)}</div>}
          </button>
          {onTake && (
            <button type="button" onClick={() => onTake(g)} className="h-8 shrink-0 rounded-pill bg-accent px-3.5 text-[12px] font-medium text-white active:scale-95">Беру</button>
          )}
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

"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTripCtx } from "./TripContext";
import { useAddExpense, useUpdateExpense, newClientId } from "@/lib/client/hooks";
import { api } from "@/lib/client/api";
import { fileToDataUrl, photoSrc } from "@/lib/client/image";
import { haptic } from "@/lib/client/tma";
import { buildSplits, round2 } from "@/lib/balances";
import { splitByItems } from "@/lib/receipt-split";
import { localISO } from "@/lib/dates";
import { fmtMoney } from "@/lib/money";
import { CATEGORIES, CURRENCIES, type Expense, type ExpenseInputT, type OpType, type ReceiptData, type ReceiptItem, type SplitType } from "@/lib/types";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { Input, Label, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "@/components/ui/Toast";

type Mode = SplitType | "items";

export function ExpenseSheet({ open, onClose, expense }: { open: boolean; onClose: () => void; expense?: Expense }) {
  const t = useTripCtx();
  const add = useAddExpense(t.trip.id, t.me.tg_id);
  const upd = useUpdateExpense(t.trip.id);
  const receiptsQ = useQuery({ queryKey: ["receipts-enabled"], queryFn: () => api<{ enabled: boolean }>(`/api/trips/${t.trip.id}/receipt`), staleTime: Infinity });
  const canRecognize = receiptsQ.data?.enabled ?? false;

  const [op, setOp] = useState<OpType>(expense?.op_type ?? "expense");
  const [desc, setDesc] = useState(expense?.description ?? "");
  const [cat, setCat] = useState(expense?.category ?? "groceries");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [cur, setCur] = useState<string>(expense?.currency ?? t.trip.base_currency);
  const [payer, setPayer] = useState<number>(expense?.paid_by ?? t.me.tg_id);
  const [to, setTo] = useState<number | null>(expense?.transfer_to ?? null);
  const [date, setDate] = useState(expense?.expense_date ?? localISO());
  const [mode, setMode] = useState<Mode>(expense?.items?.length ? "items" : (expense?.split_type ?? "equal"));
  const [included, setIncluded] = useState<Set<number>>(() => new Set(expense ? expense.splits.map((s) => s.tg_id) : t.members.map((m) => m.tg_id)));
  const [parts, setParts] = useState<Record<number, number>>(() => Object.fromEntries(t.members.map((m) => [m.tg_id, 1])));
  const [amounts, setAmounts] = useState<Record<number, string>>(() => Object.fromEntries(expense?.splits.map((s) => [s.tg_id, String(s.amount)]) ?? []));

  // Чек
  const [photo, setPhoto] = useState<string | null>(expense?.photo_url ?? null);
  const [items, setItems] = useState<ReceiptItem[]>(expense?.items ?? []);
  const [receiptNote, setReceiptNote] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const num = Number(amount.replace(",", "."));
  const members = t.members;
  const includedIds = useMemo(() => members.map((m) => m.tg_id).filter((id) => included.has(id)), [members, included]);

  const preview = useMemo(() => {
    if (!num || op === "transfer") return [] as { tg_id: number; amount: number }[];
    if (mode === "items") {
      const by = splitByItems(items, num, includedIds);
      return includedIds.map((id) => ({ tg_id: id, amount: by[id] ?? 0 }));
    }
    const list = includedIds.map((id) => ({
      tg_id: id,
      value: mode === "parts" ? parts[id] ?? 1 : mode === "amounts" ? Number((amounts[id] ?? "").replace(",", ".")) || 0 : 1,
    }));
    return buildSplits(num, mode, list);
  }, [num, op, mode, items, includedIds, parts, amounts]);

  const amountsSum = preview.reduce((s, p) => s + p.amount, 0);
  const amountsOk = mode !== "amounts" || Math.abs(amountsSum - num) < 0.01;

  function toggle(id: number) {
    setIncluded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setScanning(true);
    setReceiptNote(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await api<{ photo_url: string; receipt: ReceiptData | null; error?: string }>(`/api/trips/${t.trip.id}/receipt`, {
        method: "POST",
        body: { image: dataUrl, recognize: canRecognize },
      });
      setPhoto(res.photo_url);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      const r = res.receipt;
      if (!r) {
        toast("Фото прикреплено");
        return;
      }
      if (r.merchant && !desc) setDesc(r.merchant);
      if (r.total) setAmount(String(r.total));
      if (r.date) setDate(r.date);
      if (r.currency) setCur(r.currency);
      if (r.items.length) {
        setItems(r.items.map((it) => ({ ...it, for: [] })));
        setMode("items");
      }
      setReceiptNote(r.confidence === "low" ? `Чек прочитан неуверенно${r.note ? `: ${r.note}` : ""}. Проверьте сумму.` : r.note);
      haptic(r.confidence === "low" ? "medium" : "success");
      toast(r.total ? `Чек распознан: ${fmtMoney(r.total, r.currency ?? cur)}` : "Чек прочитан частично — заполните сумму");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggleItemFor(idx: number, id: number) {
    setItems((list) => list.map((it, i) => {
      if (i !== idx) return it;
      const has = it.for.includes(id);
      return { ...it, for: has ? it.for.filter((x) => x !== id) : [...it.for, id] };
    }));
  }

  async function submit() {
    if (!num || num <= 0) return toast("Введите сумму", "error");
    if (op === "transfer" && (!to || to === payer)) return toast("Выберите получателя", "error");
    if (op !== "transfer" && !includedIds.length) return toast("Выберите, на кого делим", "error");
    if (!amountsOk) return toast(`Суммы долей (${fmtMoney(amountsSum, cur)}) не сходятся с общей`, "error");

    const input: ExpenseInputT = {
      op_type: op,
      paid_by: payer,
      transfer_to: op === "transfer" ? to : null,
      amount: round2(num),
      currency: cur as ExpenseInputT["currency"],
      description: op === "transfer" ? "" : desc.trim(),
      category: op === "transfer" ? "transfer" : cat,
      split_type: mode === "items" ? "amounts" : mode,
      expense_date: date,
      photo_url: photo,
      items: mode === "items" && items.length ? items : null,
      client_id: expense ? null : newClientId(),
      splits: op === "transfer" ? [] : preview.filter((p) => p.amount > 0),
    };
    try {
      if (expense) await upd.mutateAsync({ id: expense.id, input });
      else add.mutate({ tripId: t.trip.id, input });
      haptic("success");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const itemsSum = items.reduce((s, it) => s + it.sum, 0);

  return (
    <Sheet open={open} onClose={onClose} full>
      <ChipRow className="mb-5 justify-center">
        <Chip on={op === "expense"} onClick={() => setOp("expense")}>💸 Расход</Chip>
        <Chip on={op === "income"} onClick={() => setOp("income")}>💰 Возврат</Chip>
        <Chip on={op === "transfer"} onClick={() => setOp("transfer")}>🔄 Перевод</Chip>
      </ChipRow>

      {op !== "transfer" && (
        <div className="mb-2.5 flex gap-2">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={op === "income" ? "Вернули залог" : "На что потратили"} className="min-w-0 flex-1" autoFocus={!expense} />
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-[132px] shrink-0" aria-label="Категория">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </Select>
        </div>
      )}

      <div className="mb-2.5 flex gap-2">
        <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма" className="tabular min-w-0 flex-1 text-[22px] font-medium" />
        <Select value={cur} onChange={(e) => setCur(e.target.value)} className="w-[96px] shrink-0" aria-label="Валюта">
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {cur !== t.trip.base_currency && num > 0 && (
        <div className={`-mt-1 mb-2.5 text-[12px] ${t.hasRate(cur) ? "text-ink-2" : "text-bad"}`}>
          {t.hasRate(cur) ? `≈ ${fmtMoney(t.inBase(num, cur), t.trip.base_currency)} по курсу ЦБ` : `Нет курса ${cur} → ${t.trip.base_currency}: в балансе сумма будет учтена 1:1`}
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <Select value={payer} onChange={(e) => setPayer(Number(e.target.value))} className="min-w-0 flex-1" aria-label={op === "transfer" ? "Кто переводит" : "Кто платил"}>
          {members.map((m) => <option key={m.tg_id} value={m.tg_id}>{t.name(m.tg_id)}{m.tg_id === t.me.tg_id ? " (я)" : ""}</option>)}
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[142px] shrink-0" />
      </div>

      {op !== "transfer" && (
        <div className="mb-5 flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} loading={scanning}>
            📷 {photo ? "Переснять" : canRecognize ? "Сфотографировать чек" : "Прикрепить фото"}
          </Button>
          {photo && <img src={photoSrc(photo) ?? ""} alt="Чек" className="h-10 w-10 rounded-lg object-cover" />}
          {scanning && <span className="text-[12px] text-ink-2">{canRecognize ? "Читаем чек…" : "Загружаем…"}</span>}
        </div>
      )}
      {receiptNote && <div className="-mt-3 mb-4 text-[12px] text-bad">{receiptNote}</div>}

      {op === "transfer" ? (
        <>
          <Label>Кому</Label>
          <ChipRow className="mb-4 flex-wrap">{members.filter((m) => m.tg_id !== payer).map((m) => <Chip key={m.tg_id} on={to === m.tg_id} onClick={() => setTo(m.tg_id)}>{t.name(m.tg_id)}</Chip>)}</ChipRow>
        </>
      ) : (
        <>
          <Label>Разделить</Label>
          <ChipRow className="mb-3">
            <Chip on={mode === "equal"} onClick={() => setMode("equal")}>Поровну</Chip>
            <Chip on={mode === "parts"} onClick={() => setMode("parts")}>По долям</Chip>
            <Chip on={mode === "amounts"} onClick={() => setMode("amounts")}>По суммам</Chip>
            {items.length > 0 && <Chip on={mode === "items"} onClick={() => setMode("items")}>По чеку</Chip>}
          </ChipRow>

          {mode === "items" && (
            <div className="mb-4 rounded-card bg-surface p-3">
              <div className="mb-2 text-[12px] text-ink-2">Отметьте, кто ел или пользовался. Без отметки — на всех.</div>
              {items.map((it, idx) => (
                <div key={idx} className="border-b border-line py-2.5 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate text-[14px] font-medium">{it.title}{it.qty > 1 ? <span className="ml-1 text-[12px] font-normal text-ink-2">× {it.qty}</span> : null}</div>
                    <div className="tabular shrink-0 text-[13.5px]">{fmtMoney(it.sum, cur)}</div>
                  </div>
                  <ChipRow className="mt-1.5 flex-wrap">
                    {includedIds.map((id) => (
                      <button key={id} type="button" onClick={() => toggleItemFor(idx, id)} className={`rounded-pill px-2.5 py-1 text-[12px] font-medium transition ${it.for.includes(id) ? "bg-inverse text-inverse-fg" : "bg-bg text-ink-2"}`}>
                        {t.name(id)}
                      </button>
                    ))}
                  </ChipRow>
                </div>
              ))}
              {num > 0 && Math.abs(itemsSum - num) >= 1 && (
                <div className="mt-2 text-[12px] text-ink-2">Позиции: {fmtMoney(itemsSum, cur)}, итог {fmtMoney(num, cur)} — разница {fmtMoney(num - itemsSum, cur)} делится на всех.</div>
              )}
            </div>
          )}

          <div>
            {members.map((m) => {
              const on = included.has(m.tg_id);
              const share = preview.find((p) => p.tg_id === m.tg_id)?.amount ?? 0;
              return (
                <div key={m.tg_id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                  <input type="checkbox" checked={on} onChange={() => toggle(m.tg_id)} className="h-5 w-5 accent-black" aria-label={t.name(m.tg_id)} />
                  <Avatar member={m} size={28} />
                  <div className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{t.name(m.tg_id)}</div>
                  {on && mode === "parts" && (
                    <div className="flex items-center">
                      <button type="button" className="h-8 w-8 rounded-full border border-line" onClick={() => setParts((p) => ({ ...p, [m.tg_id]: Math.max(0, (p[m.tg_id] ?? 1) - 1) }))}>−</button>
                      <span className="tabular w-7 text-center text-[15px] font-medium">{parts[m.tg_id] ?? 1}</span>
                      <button type="button" className="h-8 w-8 rounded-full border border-line" onClick={() => setParts((p) => ({ ...p, [m.tg_id]: (p[m.tg_id] ?? 1) + 1 }))}>+</button>
                    </div>
                  )}
                  {on && mode === "amounts" && (
                    <Input inputMode="decimal" value={amounts[m.tg_id] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [m.tg_id]: e.target.value }))} placeholder="0" className="tabular w-[84px] !py-2 text-center" />
                  )}
                  {on && mode !== "amounts" && <div className="tabular w-[80px] shrink-0 text-right text-[13px] text-ink-2">{num ? fmtMoney(share, cur) : ""}</div>}
                </div>
              );
            })}
          </div>
          {mode === "amounts" && num > 0 && (
            <div className={`mt-2 text-[12px] ${amountsOk ? "text-ink-2" : "text-bad"}`}>Сумма долей: {fmtMoney(amountsSum, cur)} из {fmtMoney(num, cur)}</div>
          )}
        </>
      )}

      <Button size="lg" variant="accent" className="mt-5" onClick={submit} loading={upd.isPending}>{expense ? "Сохранить" : "Добавить"}</Button>
    </Sheet>
  );
}

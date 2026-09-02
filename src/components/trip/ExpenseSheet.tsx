"use client";

import { useEffect, useMemo, useState } from "react";
import { useTripCtx } from "./TripContext";
import { useAddExpense, useUpdateExpense, newClientId } from "@/lib/client/hooks";
import { haptic } from "@/lib/client/tma";
import { buildSplits, round2 } from "@/lib/balances";
import { localISO } from "@/lib/dates";
import { fmtMoney } from "@/lib/money";
import { CATEGORIES, CURRENCIES, type Expense, type ExpenseInputT, type OpType, type SplitType } from "@/lib/types";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { Input, Label, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "@/components/ui/Toast";

export function ExpenseSheet({ open, onClose, expense }: { open: boolean; onClose: () => void; expense?: Expense }) {
  const t = useTripCtx();
  const add = useAddExpense(t.trip.id, t.me.tg_id);
  const upd = useUpdateExpense(t.trip.id);

  const [op, setOp] = useState<OpType>(expense?.op_type ?? "expense");
  const [desc, setDesc] = useState(expense?.description ?? "");
  const [cat, setCat] = useState(expense?.category ?? "groceries");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [cur, setCur] = useState<string>(expense?.currency ?? t.trip.base_currency);
  const [payer, setPayer] = useState<number>(expense?.paid_by ?? t.me.tg_id);
  const [to, setTo] = useState<number | null>(expense?.transfer_to ?? null);
  const [date, setDate] = useState(expense?.expense_date ?? localISO());
  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type ?? "equal");
  const [included, setIncluded] = useState<Set<number>>(() => new Set(expense ? expense.splits.map((s) => s.tg_id) : t.members.map((m) => m.tg_id)));
  const [parts, setParts] = useState<Record<number, number>>(() => Object.fromEntries(t.members.map((m) => [m.tg_id, 1])));
  const [amounts, setAmounts] = useState<Record<number, string>>(() => Object.fromEntries(expense?.splits.map((s) => [s.tg_id, String(s.amount)]) ?? []));

  useEffect(() => {
    if (expense?.split_type === "parts") {
      // восстановить доли из сумм невозможно точно — оставляем по 1
    }
  }, [expense]);

  const num = Number(amount.replace(",", "."));
  const preview = useMemo(() => {
    if (!num || op === "transfer") return [];
    const list = t.members.filter((m) => included.has(m.tg_id)).map((m) => ({
      tg_id: m.tg_id,
      value: splitType === "parts" ? parts[m.tg_id] ?? 1 : splitType === "amounts" ? Number((amounts[m.tg_id] ?? "").replace(",", ".")) || 0 : 1,
    }));
    return buildSplits(num, splitType, list);
  }, [num, op, splitType, included, parts, amounts, t.members]);

  const amountsSum = preview.reduce((s, p) => s + p.amount, 0);
  const amountsOk = splitType !== "amounts" || Math.abs(amountsSum - num) < 0.01;

  function toggle(id: number) {
    setIncluded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function submit() {
    if (!num || num <= 0) return toast("Введите сумму", "error");
    if (op === "transfer" && (!to || to === payer)) return toast("Выберите получателя", "error");
    if (op !== "transfer" && !included.size) return toast("Выберите, на кого делим", "error");
    if (!amountsOk) return toast(`Суммы долей (${fmtMoney(amountsSum, cur)}) не сходятся с общей`, "error");

    const input: ExpenseInputT = {
      op_type: op,
      paid_by: payer,
      transfer_to: op === "transfer" ? to : null,
      amount: round2(num),
      currency: cur as ExpenseInputT["currency"],
      description: op === "transfer" ? "" : desc.trim(),
      category: op === "transfer" ? "transfer" : cat,
      split_type: splitType,
      expense_date: date,
      photo_url: null,
      client_id: expense ? null : newClientId(),
      splits: op === "transfer" ? [] : preview,
    };
    try {
      if (expense) {
        await upd.mutateAsync({ id: expense.id, input });
      } else {
        // Не ждём сервер: офлайн мутация встанет в очередь, а список уже обновлён.
        add.mutate({ tripId: t.trip.id, input });
      }
      haptic("success");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const members = t.members;

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

      <div className="mb-5 flex gap-2">
        <Select value={payer} onChange={(e) => setPayer(Number(e.target.value))} className="min-w-0 flex-1" aria-label={op === "transfer" ? "Кто переводит" : "Кто платил"}>
          {members.map((m) => <option key={m.tg_id} value={m.tg_id}>{t.name(m.tg_id)}{m.tg_id === t.me.tg_id ? " (я)" : ""}</option>)}
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[142px] shrink-0" />
      </div>

      {op === "transfer" ? (
        <>
          <Label>Кому</Label>
          <ChipRow className="mb-4 flex-wrap">{members.filter((m) => m.tg_id !== payer).map((m) => <Chip key={m.tg_id} on={to === m.tg_id} onClick={() => setTo(m.tg_id)}>{t.name(m.tg_id)}</Chip>)}</ChipRow>
        </>
      ) : (
        <>
          <Label>Разделить</Label>
          <ChipRow className="mb-3">
            <Chip on={splitType === "equal"} onClick={() => setSplitType("equal")}>Поровну</Chip>
            <Chip on={splitType === "parts"} onClick={() => setSplitType("parts")}>По долям</Chip>
            <Chip on={splitType === "amounts"} onClick={() => setSplitType("amounts")}>По суммам</Chip>
          </ChipRow>
          <div>
            {members.map((m) => {
              const on = included.has(m.tg_id);
              const share = preview.find((p) => p.tg_id === m.tg_id)?.amount ?? 0;
              return (
                <div key={m.tg_id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                  <input type="checkbox" checked={on} onChange={() => toggle(m.tg_id)} className="h-5 w-5 accent-black" aria-label={t.name(m.tg_id)} />
                  <Avatar member={m} size={28} />
                  <div className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{t.name(m.tg_id)}</div>
                  {on && splitType === "parts" && (
                    <div className="flex items-center">
                      <button type="button" className="h-8 w-8 rounded-full border border-line" onClick={() => setParts((p) => ({ ...p, [m.tg_id]: Math.max(0, (p[m.tg_id] ?? 1) - 1) }))}>−</button>
                      <span className="tabular w-7 text-center text-[15px] font-medium">{parts[m.tg_id] ?? 1}</span>
                      <button type="button" className="h-8 w-8 rounded-full border border-line" onClick={() => setParts((p) => ({ ...p, [m.tg_id]: (p[m.tg_id] ?? 1) + 1 }))}>+</button>
                    </div>
                  )}
                  {on && splitType === "amounts" && (
                    <Input inputMode="decimal" value={amounts[m.tg_id] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [m.tg_id]: e.target.value }))} placeholder="0" className="tabular w-[84px] !py-2 text-center" />
                  )}
                  {on && splitType !== "amounts" && <div className="tabular w-[80px] shrink-0 text-right text-[13px] text-ink-2">{num ? fmtMoney(share, cur) : ""}</div>}
                </div>
              );
            })}
          </div>
          {splitType === "amounts" && num > 0 && (
            <div className={`mt-2 text-[12px] ${amountsOk ? "text-ink-2" : "text-bad"}`}>Сумма долей: {fmtMoney(amountsSum, cur)} из {fmtMoney(num, cur)}</div>
          )}
        </>
      )}

      <Button size="lg" variant="accent" className="mt-5" onClick={submit} loading={upd.isPending}>{expense ? "Сохранить" : "Добавить"}</Button>
    </Sheet>
  );
}

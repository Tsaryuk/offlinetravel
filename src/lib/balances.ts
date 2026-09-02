import type { Expense, Settlement } from "./types";

// Логика балансов перенесена из v1 (calcBalances / calcSettlements) без изменений
// в семантике: положительный баланс — участнику должны, отрицательный — он должен.

export type Rates = Record<string, number>; // курс валюты к базовой: 1 единица = rate базовых

export function toBase(amount: number, currency: string, base: string, rates: Rates): number {
  if (currency === base) return amount;
  const r = rates[currency];
  return r ? amount * r : amount;
}

export function calcBalances(
  memberIds: number[],
  expenses: Expense[],
  settlements: Settlement[],
  base: string,
  rates: Rates = {},
): Record<number, number> {
  const bal: Record<number, number> = {};
  memberIds.forEach((id) => (bal[id] = 0));
  const add = (id: number, v: number) => (bal[id] = (bal[id] ?? 0) + v);

  for (const e of expenses) {
    const amt = toBase(Number(e.amount), e.currency, base, rates);
    if (e.op_type === "transfer") {
      add(e.paid_by, amt);
      if (e.transfer_to) add(e.transfer_to, -amt);
    } else {
      add(e.paid_by, amt);
    }
    for (const s of e.splits) add(s.tg_id, -toBase(Number(s.amount), e.currency, base, rates));
  }
  for (const s of settlements) {
    const amt = toBase(Number(s.amount), s.currency, base, rates);
    add(s.from_tg_id, amt);
    add(s.to_tg_id, -amt);
  }
  return bal;
}

export interface Transfer {
  from: number;
  to: number;
  amount: number;
}

/** Минимальный набор переводов, закрывающий все долги (жадный алгоритм, как в v1). */
export function calcSettlements(balances: Record<number, number>): Transfer[] {
  const debtors: { id: number; amount: number }[] = [];
  const creditors: { id: number; amount: number }[] = [];
  for (const [id, amt] of Object.entries(balances)) {
    const r = Math.round(amt);
    if (r < 0) debtors.push({ id: Number(id), amount: -r });
    if (r > 0) creditors.push({ id: Number(id), amount: r });
  }
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const result: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const t = Math.min(debtors[i].amount, creditors[j].amount);
    if (t > 0) result.push({ from: debtors[i].id, to: creditors[j].id, amount: t });
    debtors[i].amount -= t;
    creditors[j].amount -= t;
    if (debtors[i].amount <= 0) i++;
    if (creditors[j].amount <= 0) j++;
  }
  return result;
}

/** Делит сумму по правилу: поровну / по долям / по суммам. Возвращает копейки ровно. */
export function buildSplits(
  amount: number,
  splitType: "equal" | "parts" | "amounts",
  parts: { tg_id: number; value: number }[],
): { tg_id: number; amount: number }[] {
  const cents = Math.round(amount * 100);
  if (splitType === "amounts") {
    return parts.map((p) => ({ tg_id: p.tg_id, amount: round2(p.value) }));
  }
  const weights = splitType === "equal" ? parts.map(() => 1) : parts.map((p) => Math.max(0, p.value));
  const total = weights.reduce((s, w) => s + w, 0);
  if (!total) return parts.map((p) => ({ tg_id: p.tg_id, amount: 0 }));

  let distributed = 0;
  const out = parts.map((p, idx) => {
    const c = Math.floor((cents * weights[idx]) / total);
    distributed += c;
    return { tg_id: p.tg_id, amount: c };
  });
  // остаток копеек — первым участникам, чтобы сумма долей равнялась расходу
  let rest = cents - distributed;
  for (let k = 0; rest > 0 && k < out.length; k++) {
    if (weights[k] > 0) {
      out[k].amount += 1;
      rest--;
    }
  }
  return out.map((o) => ({ tg_id: o.tg_id, amount: o.amount / 100 }));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

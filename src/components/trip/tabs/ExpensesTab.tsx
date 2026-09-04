"use client";

import { useMemo, useState } from "react";
import { useTripCtx } from "@/components/trip/TripContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { Card, StatTile, SectionTitle, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExpenseSheet } from "@/components/trip/ExpenseSheet";
import { ExpenseDetail } from "@/components/trip/ExpenseDetail";
import { BalanceView } from "@/components/trip/BalanceView";
import { fmtMoney } from "@/lib/money";
import { relativeDayLabel } from "@/lib/dates";
import { CATEGORIES, categoryOf, type Expense } from "@/lib/types";

export function ExpensesTab({ initialTab, active }: { initialTab?: "ops" | "balance"; active?: boolean }) {
  const t = useTripCtx();
  const [tab, setTab] = useState<"ops" | "balance">(initialTab ?? "ops");
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<Expense | null>(null);
  const cur = t.trip.base_currency;

  const { mine, total } = useMemo(() => {
    let mine = 0;
    let total = 0;
    for (const e of t.expenses) {
      if (e.op_type !== "expense") continue;
      total += t.inBase(e.amount, e.currency);
      const s = e.splits.find((x) => x.tg_id === t.me.tg_id);
      if (s) mine += t.inBase(s.amount, e.currency);
    }
    return { mine, total };
  }, [t]);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of t.expenses) {
      if (e.op_type !== "expense") continue;
      m.set(e.category, (m.get(e.category) ?? 0) + t.inBase(e.amount, e.currency));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [t]);

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of t.expenses) {
      const k = e.expense_date;
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [t.expenses]);

  return (
    <>
      <PageHeader title="Расходы" />
      <ChipRow className="mb-5">
        <Chip on={tab === "ops"} onClick={() => setTab("ops")}>Операции</Chip>
        <Chip on={tab === "balance"} onClick={() => setTab("balance")}>Баланс</Chip>
      </ChipRow>

      {tab === "balance" ? (
        <BalanceView />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-2">
            <StatTile value={fmtMoney(mine, cur)} label="Моя доля" />
            <StatTile value={fmtMoney(total, cur)} label="Общие расходы" />
          </div>

          {byCat.length > 1 && (
            <div className="mb-2">
              {byCat.map(([id, sum]) => {
                const c = CATEGORIES.find((x) => x.id === id);
                const pct = total ? Math.round((sum / total) * 100) : 0;
                return (
                  <div key={id} className="flex items-center gap-3 py-1.5">
                    <div className="w-6 text-center text-[15px]">{c?.icon ?? "📦"}</div>
                    <div className="w-[118px] shrink-0 truncate text-[13px] text-ink-2">{c?.label ?? id}</div>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: c?.tint ?? "#4b5563" }} /></div>
                    <div className="tabular w-[72px] shrink-0 text-right text-[13px] font-medium">{fmtMoney(sum, cur)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {!t.expenses.length && <EmptyState icon="💸" title="Пока нет расходов" text="Добавьте первый — и приложение само посчитает, кто кому должен." action={<Button size="sm" onClick={() => setAddOpen(true)}>Добавить расход</Button>} />}

          {groups.map(([day, list]) => (
            <div key={day}>
              <SectionTitle className="mt-4">{relativeDayLabel(day)}</SectionTitle>
              <div className="flex flex-col gap-1.5">
                {list.map((e) => <ExpenseRow key={e.id} e={e} onClick={() => setDetail(e)} />)}
              </div>
            </div>
          ))}

          {active && (
            <button
              type="button"
              aria-label="Добавить расход"
              onClick={() => setAddOpen(true)}
              className="fixed right-5 z-[45] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[28px] font-light text-white transition active:scale-95"
              style={{ bottom: "calc(var(--nav-h) + var(--safe-bottom) + 18px)" }}
            >+</button>
          )}
        </>
      )}

      <ExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />
      {detail && <ExpenseDetail expense={t.expenses.find((x) => x.id === detail.id) ?? detail} onClose={() => setDetail(null)} />}
    </>
  );
}

function ExpenseRow({ e, onClick }: { e: Expense; onClick: () => void }) {
  const t = useTripCtx();
  const cat = categoryOf(e.category);
  const icon = e.op_type === "transfer" ? "🔄" : e.op_type === "income" ? "💰" : cat.icon;
  const title = e.op_type === "transfer" ? `${t.name(e.paid_by)} → ${t.name(e.transfer_to ?? 0)}` : e.description || cat.label;
  const sub = e.op_type === "transfer" ? "Перевод" : `${t.name(e.paid_by)} · ${e.splits.length} чел.`;
  const pending = e.id.startsWith("tmp_");
  return (
    <Card className={`flex cursor-pointer items-center gap-3.5 px-[18px] py-3.5 active:bg-surface-2 ${pending ? "opacity-60" : ""}`} onClick={onClick}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px]"
        style={{ background: e.op_type === "income" ? "var(--color-good-soft)" : e.op_type === "transfer" ? "var(--color-surface-2)" : cat.color }}
      >{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium tracking-[-0.01em]">{title}</div>
        <div className="mt-0.5 text-[12.5px] text-ink-2">{sub}{pending ? " · отправится позже" : ""}</div>
      </div>
      <div className={`tabular shrink-0 text-[15px] font-medium ${e.op_type === "income" ? "text-good" : ""}`}>{e.op_type === "income" ? "+" : ""}{fmtMoney(e.amount, e.currency)}</div>
    </Card>
  );
}


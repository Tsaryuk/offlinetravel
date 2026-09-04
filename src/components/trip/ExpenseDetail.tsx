"use client";

import { useState } from "react";
import { useTripCtx } from "./TripContext";
import { useDeleteExpense } from "@/lib/client/hooks";
import { ExpenseSheet } from "./ExpenseSheet";
import { Sheet, Confirm } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "@/components/ui/Toast";
import { fmtMoney } from "@/lib/money";
import { dayLabel } from "@/lib/dates";
import { categoryOf, type Expense } from "@/lib/types";
import { photoSrc } from "@/lib/client/image";

export function ExpenseDetail({ expense: e, onClose }: { expense: Expense; onClose: () => void }) {
  const t = useTripCtx();
  const del = useDeleteExpense(t.trip.id);
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const canEdit = t.isAdmin || e.created_by === t.me.tg_id || e.paid_by === t.me.tg_id;
  const cat = categoryOf(e.category);

  if (edit) return <ExpenseSheet open onClose={() => { setEdit(false); onClose(); }} expense={e} />;

  return (
    <Sheet open onClose={onClose}>
      <div className="text-[20px] font-medium tracking-[-0.02em]">
        {e.op_type === "transfer" ? `${t.name(e.paid_by)} → ${t.name(e.transfer_to ?? 0)}` : e.description || cat.label}
      </div>
      <div className="mt-1 text-[13px] text-ink-2">
        {dayLabel(e.expense_date)} · {e.op_type === "transfer" ? "Перевод" : e.op_type === "income" ? "Возврат" : `${cat.icon} ${cat.label}`} · {e.op_type === "transfer" ? "отправил" : "платил"} {t.name(e.paid_by)}
      </div>
      <div className="tabular mt-4 text-[34px] font-medium tracking-[-0.03em]">{fmtMoney(e.amount, e.currency)}</div>

      {e.photo_url && (
        <a href={photoSrc(e.photo_url) ?? "#"} target="_blank" rel="noopener" className="mt-3 block">
          <img src={photoSrc(e.photo_url) ?? ""} alt="Чек" className="max-h-44 rounded-field object-cover" />
        </a>
      )}

      {e.items && e.items.length > 0 && (
        <div className="mt-4 rounded-card bg-surface p-3">
          <div className="mb-1 text-[12px] font-medium text-ink-2">По чеку</div>
          {e.items.map((it, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2 py-1 text-[13.5px]">
              <div className="min-w-0 flex-1 truncate">{it.title}{it.qty > 1 ? ` × ${it.qty}` : ""}<span className="ml-1.5 text-[12px] text-ink-2">{it.for.length ? it.for.map((id) => t.name(id)).join(", ") : "все"}</span></div>
              <div className="tabular shrink-0">{fmtMoney(it.sum, e.currency)}</div>
            </div>
          ))}
        </div>
      )}

      {e.op_type !== "transfer" && (
        <div className="mt-4">
          {e.splits.map((s) => (
            <div key={s.tg_id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
              <Avatar member={t.membersById.get(s.tg_id)} size={28} />
              <div className="flex-1 text-[14.5px] font-medium">{t.name(s.tg_id)}{s.tg_id === t.me.tg_id ? <span className="ml-1 text-[12px] font-normal text-ink-2">(я)</span> : null}</div>
              <div className="tabular text-[14px] text-ink-2">{fmtMoney(s.amount, e.currency)}</div>
            </div>
          ))}
        </div>
      )}

      {canEdit && !e.id.startsWith("tmp_") && (
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setEdit(true)}>Изменить</Button>
          <Button variant="ghost" className="flex-1 text-bad" onClick={() => setConfirm(true)}>Удалить</Button>
        </div>
      )}
      <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>Закрыть</Button>

      <Confirm open={confirm} title="Удалить операцию?" text="Балансы пересчитаются." danger confirmLabel="Удалить" onCancel={() => setConfirm(false)} onConfirm={async () => {
        setConfirm(false);
        try { await del.mutateAsync(e.id); onClose(); } catch (err) { toast((err as Error).message, "error"); }
      }} />
    </Sheet>
  );
}

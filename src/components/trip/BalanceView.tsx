"use client";

import { useState } from "react";
import { useTripCtx } from "./TripContext";
import { useAddSettlement, newClientId } from "@/lib/client/hooks";
import { haptic } from "@/lib/client/tma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Confirm } from "@/components/ui/Sheet";
import { fmtMoney } from "@/lib/money";
import type { Transfer } from "@/lib/balances";

export function BalanceView() {
  const t = useTripCtx();
  const settle = useAddSettlement(t.trip.id);
  const [confirm, setConfirm] = useState<Transfer | null>(null);
  const cur = t.trip.base_currency;
  const me = t.me.tg_id;

  const owedToMe = t.transfers.filter((x) => x.to === me);
  const iOwe = t.transfers.filter((x) => x.from === me);
  const others = t.transfers.filter((x) => x.from !== me && x.to !== me);
  const myBal = Math.round(t.balances[me] ?? 0);

  return (
    <>
      <Card className="p-[18px]">
        <div className={`tabular text-[32px] font-medium leading-none tracking-[-0.03em] ${myBal > 0 ? "text-good" : myBal < 0 ? "text-bad" : ""}`}>
          {myBal === 0 ? "Всё ровно" : fmtMoney(myBal, cur, { sign: true })}
        </div>
        <div className="mt-2 text-[13px] text-ink-2">
          {myBal > 0 ? "вам должны вернуть" : myBal < 0 ? "вы должны вернуть" : "долгов нет — можно расслабиться"}
        </div>
      </Card>

      {(iOwe.length > 0 || owedToMe.length > 0) && (
        <>
          <SectionTitle>Мои расчёты</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {iOwe.map((x) => (
              <Row key={`o${x.to}`} tgId={x.to} text={`Вы → ${t.name(x.to)}`} amount={x.amount} cur={cur} tone="bad" />
            ))}
            {owedToMe.map((x) => (
              <Row key={`i${x.from}`} tgId={x.from} text={`${t.name(x.from)} → вы`} amount={x.amount} cur={cur} tone="good" action={{ label: "Получил", onClick: () => setConfirm(x) }} />
            ))}
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <SectionTitle>Остальные</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {others.map((x) => (
              <Row key={`${x.from}-${x.to}`} tgId={x.from} text={`${t.name(x.from)} → ${t.name(x.to)}`} amount={x.amount} cur={cur} action={t.isAdmin ? { label: "Получено", onClick: () => setConfirm(x) } : undefined} />
            ))}
          </div>
        </>
      )}

      <SectionTitle>Баланс участников</SectionTitle>
      <div className="flex flex-col gap-1.5">
        {[...t.members].sort((a, b) => (t.balances[b.tg_id] ?? 0) - (t.balances[a.tg_id] ?? 0)).map((m) => {
          const b = Math.round(t.balances[m.tg_id] ?? 0);
          return (
            <Card key={m.tg_id} className="flex items-center gap-3.5 px-[18px] py-3.5">
              <Avatar member={m} size={38} />
              <div className="flex-1 text-[15px] font-medium">{t.name(m.tg_id)}{m.tg_id === me ? <span className="ml-1 text-[12px] font-normal text-ink-2">я</span> : null}</div>
              <div className={`tabular text-[16px] font-medium ${b > 0 ? "text-good" : b < 0 ? "text-bad" : "text-ink-2"}`}>{b === 0 ? "0" : fmtMoney(b, cur, { sign: true })}</div>
            </Card>
          );
        })}
      </div>

      <Confirm
        open={Boolean(confirm)}
        title="Отметить как полученное?"
        text={confirm ? `${t.name(confirm.from)} → ${t.name(confirm.to)}: ${fmtMoney(confirm.amount, cur)}` : ""}
        confirmLabel="Получено"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          settle.mutate({ tripId: t.trip.id, input: { from_tg_id: confirm.from, to_tg_id: confirm.to, amount: confirm.amount, currency: cur, client_id: newClientId() } });
          haptic("success");
          setConfirm(null);
        }}
      />
    </>
  );
}

function Row({ tgId, text, amount, cur, tone, action }: { tgId: number; text: string; amount: number; cur: string; tone?: "good" | "bad"; action?: { label: string; onClick: () => void } }) {
  const t = useTripCtx();
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <Avatar member={t.membersById.get(tgId)} size={32} />
      <div className="flex-1 text-[14.5px] font-medium">{text}</div>
      <div className={`tabular text-[15px] font-medium ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{fmtMoney(amount, cur)}</div>
      {action && <button type="button" onClick={action.onClick} className="ml-1 h-8 shrink-0 rounded-pill bg-inverse px-3.5 text-[12px] font-medium text-inverse-fg active:scale-95">{action.label}</button>}
    </Card>
  );
}

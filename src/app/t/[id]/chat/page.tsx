"use client";

import { useEffect, useRef, useState } from "react";
import { useTripCtx } from "@/components/trip/TripContext";
import { useMessages, useSendMessage, newClientId } from "@/lib/client/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { haptic } from "@/lib/client/tma";
import { dayLabel, localISO } from "@/lib/dates";

export default function ChatPage() {
  const t = useTripCtx();
  const q = useMessages(t.trip.id);
  const send = useSendMessage(t.trip.id, t.me.tg_id);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const msgs = q.data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  function submit() {
    const v = text.trim();
    if (!v) return;
    send.mutate({ tripId: t.trip.id, input: { text: v, client_id: newClientId() } });
    setText("");
    haptic("light");
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - var(--nav-h) - var(--safe-bottom))" }}>
      <PageHeader title="Чат" sub={`${t.members.length} участников`} />
      <div className="flex flex-1 flex-col gap-1.5 pb-20">
        {q.isLoading && !msgs.length && <div className="text-center text-[13px] text-ink-3">Загружаем…</div>}
        {!q.isLoading && !msgs.length && <div className="py-14 text-center text-[14px] text-ink-2">Пока тихо. Напишите первым.</div>}
        {msgs.map((m, i) => {
          const day = m.created_at.slice(0, 10);
          const showDay = i === 0 || msgs[i - 1].created_at.slice(0, 10) !== day;
          const mine = m.author_tg_id === t.me.tg_id;
          const time = new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className="flex flex-col">
              {showDay && <div className="my-3 text-center text-[12px] font-medium text-ink-3">{day === localISO() ? "Сегодня" : dayLabel(day)}</div>}
              <div className={`max-w-[80%] rounded-[20px] px-[15px] py-[11px] text-[14.5px] leading-snug ${mine ? "self-end rounded-br-[6px] bg-inverse text-inverse-fg" : "self-start rounded-bl-[6px] bg-surface"} ${m.id.startsWith("tmp_") ? "opacity-60" : ""}`}>
                {!mine && <div className="mb-0.5 text-[12px] font-medium text-accent">{t.name(m.author_tg_id)}</div>}
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className={`tabular mt-1 text-right text-[10.5px] ${mine ? "text-inverse-fg/50" : "text-ink-3"}`}>{time}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="fixed left-0 right-0 z-[45] border-t border-line bg-bg" style={{ bottom: "calc(var(--nav-h) + var(--safe-bottom))" }}>
        <form className="mx-auto flex max-w-lg gap-2 px-5 py-2.5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение…" maxLength={1000} className="flex-1 rounded-pill bg-surface px-4 py-[11px] text-[15px] outline-none placeholder:text-ink-3 focus:ring-1 focus:ring-ink" />
          <button type="submit" aria-label="Отправить" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-inverse text-inverse-fg active:scale-95">➤</button>
        </form>
      </div>
    </div>
  );
}

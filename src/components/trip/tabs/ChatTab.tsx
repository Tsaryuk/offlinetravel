"use client";

import { useEffect, useRef, useState } from "react";
import { useTripCtx } from "@/components/trip/TripContext";
import { useMessages, useSendMessage, newClientId } from "@/lib/client/hooks";
import { haptic } from "@/lib/client/tma";
import { dayLabel, localISO } from "@/lib/dates";

/**
 * Чат занимает всю высоту своей панели: лента сообщений прокручивается внутри,
 * поле ввода прижато к низу этой же панели — поэтому оно не появляется
 * поверх соседних вкладок.
 */
export function ChatTab() {
  const t = useTripCtx();
  const q = useMessages(t.trip.id);
  const send = useSendMessage(t.trip.id, t.me.tg_id);
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const msgs = q.data ?? [];

  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  function submit() {
    const v = text.trim();
    if (!v) return;
    send.mutate({ tripId: t.trip.id, input: { text: v, client_id: newClientId() } });
    setText("");
    haptic("light");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between bg-bg pb-3 pt-5" style={{ paddingTop: "calc(20px + var(--safe-top))" }}>
        <h1 className="text-[28px] font-medium leading-none tracking-[-0.03em]">Чат</h1>
        <span className="text-[13px] text-ink-2">{t.members.length} участников</span>
      </div>

      <div ref={list} className="flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pb-2">
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
      </div>

      <form className="flex shrink-0 gap-2 border-t border-line bg-bg py-2.5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение…"
          maxLength={1000}
          className="min-w-0 flex-1 rounded-pill bg-surface px-4 py-[11px] text-[16px] outline-none placeholder:text-ink-3 focus:ring-1 focus:ring-ink"
        />
        <button type="submit" aria-label="Отправить" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white active:scale-95">➤</button>
      </form>
    </div>
  );
}

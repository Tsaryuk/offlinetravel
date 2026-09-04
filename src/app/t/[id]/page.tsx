"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTripCtx } from "@/components/trip/TripContext";
import { BottomNav, TABS } from "@/components/trip/BottomNav";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { HomeTab } from "@/components/trip/tabs/HomeTab";
import { ExpensesTab } from "@/components/trip/tabs/ExpensesTab";
import { PlacesTab } from "@/components/trip/tabs/PlacesTab";
import { ChatTab } from "@/components/trip/tabs/ChatTab";
import { MembersTab } from "@/components/trip/tabs/MembersTab";
import { haptic } from "@/lib/client/tma";

/**
 * Все вкладки живут в одной горизонтальной ленте: переключение мгновенное,
 * свайп — обычная прокрутка с прилипанием, позиция каждой вкладки сохраняется.
 */
export default function TripPage() {
  const t = useTripCtx();
  const strip = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  const [expensesTab, setExpensesTab] = useState<"ops" | "balance">("ops");
  const lastHaptic = useRef(0);

  useEffect(() => {
    try { localStorage.setItem("ot_last_trip", t.trip.id); } catch { /* приватный режим */ }
  }, [t.trip.id]);

  const goTab = useCallback((index: number, sub?: "balance") => {
    if (sub) setExpensesTab(sub);
    const el = strip.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, []);

  // Следим за лентой: подсвечиваем нужную кнопку и отзываемся вибрацией на смену
  function onScroll() {
    const el = strip.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== tab && i >= 0 && i < TABS.length) {
      setTab(i);
      if (Date.now() - lastHaptic.current > 250) {
        lastHaptic.current = Date.now();
        haptic("light");
      }
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div ref={strip} onScroll={onScroll} className="snap-strip flex-1">
        <Pane><PullToRefresh><HomeTab onGoTab={goTab} /></PullToRefresh></Pane>
        <Pane><PullToRefresh><ExpensesTab initialTab={expensesTab} key={expensesTab} active={tab === 1} /></PullToRefresh></Pane>
        <Pane><PullToRefresh><PlacesTab active={tab === 2} /></PullToRefresh></Pane>
        <Pane chat><ChatTab /></Pane>
        <Pane><PullToRefresh><MembersTab /></PullToRefresh></Pane>
      </div>
      <BottomNav current={tab} onSelect={goTab} />
    </div>
  );
}

function Pane({ children, chat }: { children: React.ReactNode; chat?: boolean }) {
  return (
    <section
      className={`snap-page mx-auto w-full max-w-lg px-5 ${chat ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain pb-6"}`}
      style={{ height: "calc(100dvh - var(--nav-h) - var(--safe-bottom))" }}
    >
      {children}
    </section>
  );
}

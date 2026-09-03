"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { haptic } from "@/lib/client/tma";

const EDGE = 44; // ширина зоны у края экрана, где начинается жест
const MIN_DISTANCE = 60;
const MAX_VERTICAL = 40; // если палец ушёл вниз сильнее — это прокрутка, не листание

/**
 * Горизонтальные свайпы между вкладками поездки — как листание экранов
 * в нативном приложении. Жест ловим только у краёв, чтобы не мешать
 * прокрутке лент, чипсов и полей внутри страницы.
 */
export function SwipeTabs({ tabs, current, children }: { tabs: string[]; current: number; children: ReactNode }) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; edge: "left" | "right" } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tabs.forEach((href) => router.prefetch(href));
  }, [tabs, router]);

  function go(delta: number) {
    const next = current + delta;
    if (next < 0 || next >= tabs.length) return;
    haptic("light");
    router.push(tabs[next]);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    const w = window.innerWidth;
    if (t.clientX <= EDGE) start.current = { x: t.clientX, y: t.clientY, edge: "left" };
    else if (t.clientX >= w - EDGE) start.current = { x: t.clientX, y: t.clientY, edge: "right" };
    else start.current = null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = Math.abs(t.clientY - s.y);
    if (dy > MAX_VERTICAL) return;
    if (s.edge === "left" && dx > MIN_DISTANCE) go(-1);
    if (s.edge === "right" && dx < -MIN_DISTANCE) go(1);
  }

  return (
    <div ref={box} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-full">
      {children}
    </div>
  );
}

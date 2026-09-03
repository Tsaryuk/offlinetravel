"use client";

import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { haptic } from "@/lib/client/tma";

const TRIGGER = 72;
const MAX = 110;

/** Потянуть вниз в самом верху страницы — обновить данные, как в мобильных приложениях. */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const start = useRef<number | null>(null);
  const armed = useRef(false);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY > 0 || busy) return;
    start.current = e.touches[0].clientY;
    armed.current = false;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (start.current === null) return;
    if (window.scrollY > 0) {
      start.current = null;
      setDragging(false);
      setPull(0);
      return;
    }
    const d = e.touches[0].clientY - start.current;
    if (d <= 0) return;
    const eased = Math.min(MAX, d * 0.5); // сопротивление, чтобы тянулось «тяжело»
    setPull(eased);
    if (!armed.current && eased >= TRIGGER) {
      armed.current = true;
      haptic("light");
    }
  }

  async function onTouchEnd() {
    const shouldRefresh = pull >= TRIGGER;
    start.current = null;
    setDragging(false);
    if (!shouldRefresh) {
      setPull(0);
      return;
    }
    setBusy(true);
    setPull(TRIGGER);
    try {
      await qc.refetchQueries({ type: "active" });
      haptic("success");
    } finally {
      setBusy(false);
      setPull(0);
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden"
        style={{ height: pull, transition: dragging ? "none" : "height .25s var(--ease-out)" }}
      >
        <div
          className={`h-6 w-6 rounded-full border-2 border-line border-t-accent ${busy ? "animate-spin" : ""}`}
          style={{ opacity: Math.min(1, pull / TRIGGER), transform: busy ? undefined : `rotate(${pull * 3}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}

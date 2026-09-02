"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; text: string; kind: "info" | "error" };
const listeners = new Set<(t: Toast) => void>();
let seq = 0;

export function toast(text: string, kind: Toast["kind"] = "info") {
  const t = { id: ++seq, text, kind };
  listeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (t: Toast) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 2800);
    };
    listeners.add(on);
    return () => void listeners.delete(on);
  }, []);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 z-[999] flex w-[min(320px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2" style={{ top: "calc(12px + var(--safe-top))" }}>
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-pill px-5 py-3 text-center text-[13px] font-medium ${t.kind === "error" ? "bg-bad text-white" : "bg-inverse text-inverse-fg"}`}
          style={{ animation: "fade-up .25s var(--ease-out)" }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

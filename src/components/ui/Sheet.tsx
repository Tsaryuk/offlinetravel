"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { onBackButton } from "@/lib/client/tma";

const CLOSE_DISTANCE = 110; // сколько пройти пальцем вниз, чтобы лист закрылся
const CLOSE_VELOCITY = 0.5; // либо резкий флик — px/мс

/**
 * Нижний лист с перетаскиванием: тянется за пальцем, закрывается свайпом вниз,
 * тапом по фону, Escape и аппаратной кнопкой «назад» в Telegram.
 */
export function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; full?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; t: number } | null>(null);
  const [dy, setDy] = useState(0);
  const [closing, setClosing] = useState(false);
  const [keyboard, setKeyboard] = useState(0);

  const finish = useCallback(() => {
    setClosing(true);
    // ждём анимацию ухода, потом снимаем с экрана
    window.setTimeout(() => {
      setClosing(false);
      setDy(0);
      onClose();
    }, 220);
  }, [onClose]);

  // Клавиатура на iPhone перекрывает нижнюю часть листа: поднимаем содержимое
  // ровно на её высоту, иначе поля ввода оказываются под ней.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboard(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
      setKeyboard(0);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const offBack = onBackButton(finish);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      offBack();
    };
  }, [open, finish]);

  function onTouchStart(e: React.TouchEvent) {
    // тянем только когда содержимое пролистано в самый верх,
    // иначе жест принадлежит прокрутке внутри листа
    if (keyboard > 0) return;
    if ((panel.current?.scrollTop ?? 0) > 0) return;
    start.current = { y: e.touches[0].clientY, t: Date.now() };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return;
    const delta = e.touches[0].clientY - start.current.y;
    if (delta <= 0) return; // вверх не тянем
    if ((panel.current?.scrollTop ?? 0) > 0) {
      start.current = null;
      setDy(0);
      return;
    }
    setDy(delta);
  }

  function onTouchEnd() {
    if (!start.current) return;
    const dt = Math.max(1, Date.now() - start.current.t);
    const fast = dy / dt > CLOSE_VELOCITY;
    start.current = null;
    if (dy > CLOSE_DISTANCE || (fast && dy > 40)) finish();
    else setDy(0);
  }

  if (!open || typeof document === "undefined") return null;

  const dragging = dy > 0;
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end bg-black/40 backdrop-blur-md"
      style={{ opacity: closing ? 0 : Math.max(0.15, 1 - dy / 420), transition: dragging ? "none" : "opacity .22s ease" }}
      onClick={finish}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`w-full overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-line bg-bg px-5 pb-6 pt-2.5 ${full ? "max-h-[95vh] min-h-[85vh]" : "max-h-[90vh]"}`}
        style={{
          paddingBottom: keyboard > 0 ? `${keyboard + 16}px` : "calc(24px + var(--safe-bottom))",
          maxHeight: keyboard > 0 ? `calc(100dvh - 24px)` : undefined,
          transform: closing ? "translateY(100%)" : `translateY(${dy}px)`,
          transition: dragging ? "none" : "transform .25s var(--ease-out)",
          animation: dragging || closing ? undefined : "sheet-up .3s var(--ease-out)",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 shrink-0 rounded-full bg-surface-2" />
        {title && <div className="mb-4 text-[20px] font-medium tracking-[-0.02em]">{title}</div>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({ open, title, text, confirmLabel = "Да", danger, onConfirm, onCancel }: {
  open: boolean; title: string; text?: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    return onBackButton(onCancel);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 p-6 backdrop-blur-md" onClick={onCancel}>
      <div className="w-full max-w-[320px] rounded-[24px] border border-line bg-bg p-6" onClick={(e) => e.stopPropagation()} style={{ animation: "scale-up .2s var(--ease-out)" }}>
        <div className="text-[18px] font-medium tracking-[-0.02em]">{title}</div>
        {text && <div className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{text}</div>}
        <div className="mt-5 flex gap-2">
          <button className="h-12 flex-1 rounded-pill border border-line text-[15px] font-medium active:scale-[.98]" onClick={onCancel}>Отмена</button>
          <button className={`h-12 flex-1 rounded-pill text-[15px] font-medium active:scale-[.98] ${danger ? "bg-bad text-white" : "bg-inverse text-inverse-fg"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { onBackButton } from "@/lib/client/tma";

const CLOSE_DISTANCE = 110; // сколько пройти пальцем вниз, чтобы лист закрылся
const CLOSE_VELOCITY = 0.5; // либо резкий флик — px/мс

interface Frame {
  top: number;
  height: number;
}

/**
 * Нижний лист.
 *
 * На iOS `position: fixed` не спасает: при фокусе на поле система прокручивает
 * страницу, чтобы показать его, и лист уезжает за верхний край. Поэтому лист
 * не «прибит» к окну, а каждый кадр позиционируется по visualViewport —
 * области, которая реально видна поверх клавиатуры. Плюс страница под листом
 * замораживается, иначе iOS утаскивает её вместе с содержимым.
 */
export function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; full?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; t: number } | null>(null);
  const [dy, setDy] = useState(0);
  const [closing, setClosing] = useState(false);
  const [frame, setFrame] = useState<Frame>({ top: 0, height: 0 });
  const [keyboard, setKeyboard] = useState(false);
  // Анимация появления играет один раз: иначе при каждом изменении высоты
  // (например, когда вылезла клавиатура) лист заново уезжал бы вниз.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setEntered(true), 320);
    return () => {
      window.clearTimeout(id);
      setEntered(false);
    };
  }, [open]);

  const finish = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setDy(0);
      onClose();
    }, 220);
  }, [onClose]);

  // Следим за видимой областью: она ужимается, когда вылезает клавиатура
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;

    const apply = () => {
      if (!vv) {
        setFrame({ top: 0, height: window.innerHeight });
        return;
      }
      setFrame({ top: vv.offsetTop, height: vv.height });
      setKeyboard(window.innerHeight - vv.height > 120);
    };
    apply();

    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      setKeyboard(false);
    };
  }, [open]);

  // Замораживаем страницу под листом, сохраняя позицию прокрутки
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, y);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    document.addEventListener("keydown", onKey);
    const offBack = onBackButton(finish);
    return () => {
      document.removeEventListener("keydown", onKey);
      offBack();
    };
  }, [open, finish]);

  function onTouchStart(e: React.TouchEvent) {
    if (keyboard) return; // при открытой клавиатуре лист не тянем — иначе прыгает
    if ((panel.current?.scrollTop ?? 0) > 0) return;
    start.current = { y: e.touches[0].clientY, t: Date.now() };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return;
    const delta = e.touches[0].clientY - start.current.y;
    if (delta <= 0) return;
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
  // Пока клавиатура открыта, лист занимает всю видимую область: так поля
  // не оказываются под ней и до кнопки сохранения можно долистать.
  const maxHeight = keyboard ? frame.height : Math.round(frame.height * (full ? 0.95 : 0.9));

  return createPortal(
    <div
      className="fixed left-0 z-[200] flex w-full items-end bg-black/40 backdrop-blur-md"
      style={{
        top: frame.top,
        height: frame.height || "100dvh",
        opacity: closing ? 0 : Math.max(0.15, 1 - dy / 420),
        transition: dragging ? "none" : "opacity .22s ease",
      }}
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
        className="w-full overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-line bg-bg px-5 pt-2.5"
        style={{
          maxHeight,
          minHeight: full && !keyboard ? Math.round(frame.height * 0.85) : undefined,
          paddingBottom: keyboard ? 24 : "calc(24px + var(--safe-bottom))",
          transform: closing ? "translateY(100%)" : `translateY(${dy}px)`,
          transition: dragging ? "none" : "transform .25s var(--ease-out)",
          animation: entered || dragging || closing ? undefined : "sheet-up .3s var(--ease-out)",
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

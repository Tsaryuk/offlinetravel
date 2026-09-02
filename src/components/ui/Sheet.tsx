"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Нижний лист (bottom sheet). Закрывается по тапу на фон и по Escape. */
export function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; full?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end bg-black/40 backdrop-blur-md" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-y-auto rounded-t-[28px] border-t border-line bg-bg px-5 pb-6 pt-2.5 ${full ? "max-h-[95vh] min-h-[85vh]" : "max-h-[90vh]"}`}
        style={{ paddingBottom: "calc(24px + var(--safe-bottom))", animation: "sheet-up .3s var(--ease-out)" }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-surface-2" />
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
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 p-6 backdrop-blur-md" onClick={onCancel}>
      <div className="w-full max-w-[320px] rounded-[24px] border border-line bg-bg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-[18px] font-medium tracking-[-0.02em]">{title}</div>
        {text && <div className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{text}</div>}
        <div className="mt-5 flex gap-2">
          <button className="h-12 flex-1 rounded-pill border border-line text-[15px] font-medium" onClick={onCancel}>Отмена</button>
          <button className={`h-12 flex-1 rounded-pill text-[15px] font-medium text-white ${danger ? "bg-bad" : "bg-inverse text-inverse-fg"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTripCtx } from "./TripContext";
import { inviteBotUrl, inviteUrl, shareInvite } from "@/lib/client/share";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { haptic } from "@/lib/client/tma";

/**
 * Приглашение участников. Главное — ссылка: по ней человек входит через Telegram
 * и сразу оказывается в поездке, без промежуточных нажатий. QR — на случай,
 * когда люди рядом; рисуется локально, без внешних сервисов, работает без сети.
 */
export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTripCtx();
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const link = inviteBotUrl(t.trip.invite_code);

  useEffect(() => {
    if (!showQr || qr) return;
    QRCode.toDataURL(link, { width: 640, margin: 1, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(null));
  }, [showQr, qr, link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      haptic("success");
      toast("Ссылка скопирована");
    } catch {
      toast(link);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Пригласить в поездку">
      <p className="mb-4 text-[14px] leading-relaxed text-ink-2">
        Отправьте ссылку в чат. Участник нажмёт её, войдёт через Telegram и сразу окажется
        в «{t.trip.name}» — ничего вводить и подтверждать не нужно.
      </p>

      <div className="mb-3 rounded-field bg-surface px-4 py-3">
        <div className="mb-1 text-[11px] font-medium text-ink-2">Ссылка-приглашение</div>
        <div className="break-all text-[13px] leading-snug">{link}</div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => shareInvite(t.trip.name, t.trip.invite_code)}>Отправить</Button>
        <Button variant="ghost" className="flex-1" onClick={copy}>Скопировать</Button>
      </div>

      <button
        type="button"
        onClick={() => setShowQr((v) => !v)}
        className="mt-4 w-full rounded-field bg-surface px-4 py-3 text-left text-[13.5px] font-medium"
      >
        {showQr ? "Скрыть QR-код" : "Показать QR-код"}
        <span className="ml-2 font-normal text-ink-2">если человек рядом</span>
      </button>

      {showQr && (
        <div className="mx-auto mt-3 w-fit rounded-card bg-white p-3">
          {qr ? <img src={qr} alt="QR-код приглашения" className="h-48 w-48" /> : <div className="h-48 w-48 skeleton rounded-lg" />}
        </div>
      )}

      <details className="mt-4 rounded-field bg-surface px-4 py-3">
        <summary className="cursor-pointer text-[13.5px] font-medium">Ссылка для браузера</summary>
        <div className="mt-2 break-all text-[12.5px] text-ink-2">{inviteUrl(t.trip.invite_code)}</div>
        <div className="mt-1.5 text-[12px] text-ink-3">Открывается вне Telegram, но войти всё равно нужно через бота.</div>
      </details>
    </Sheet>
  );
}

"use client";

import { toast } from "@/components/ui/Toast";

export function inviteUrl(inviteCode: string): string {
  return `${window.location.origin}/join/${inviteCode}`;
}

/** Ссылка на бота: внутри Telegram открывается сразу как Mini App. */
export function inviteBotUrl(inviteCode: string): string {
  const bot = process.env.NEXT_PUBLIC_BOT_USERNAME || "offlinetravel_bot";
  return `https://t.me/${bot}?start=join_${inviteCode}`;
}

export async function shareInvite(tripName: string, inviteCode: string): Promise<void> {
  const url = inviteBotUrl(inviteCode);
  const text = `Присоединяйся к поездке «${tripName}» в Offline.Travel`;
  try {
    if (navigator.share) {
      await navigator.share({ title: tripName, text, url });
      return;
    }
  } catch {
    /* пользователь отменил — не ошибка */
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast("Ссылка скопирована");
  } catch {
    toast(url);
  }
}

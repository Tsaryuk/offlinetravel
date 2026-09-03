import { parse, validate } from "@tma.js/init-data-node";
import { env } from "./env";

export interface TgUser {
  tgId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  /** Параметр из прямой ссылки на Mini App (?startapp=…). */
  startParam?: string;
}

const INIT_DATA_MAX_AGE_SEC = 60 * 60 * 24; // сутки — Telegram выдаёт initData при каждом открытии

/**
 * Проверяет подпись initData из Telegram Mini App и возвращает пользователя.
 * Бросает ошибку, если подпись невалидна или данные устарели.
 */
export function verifyInitData(raw: string): TgUser {
  validate(raw, env().TELEGRAM_BOT_TOKEN, { expiresIn: INIT_DATA_MAX_AGE_SEC });
  const data = parse(raw);
  const u = data.user;
  if (!u) throw new Error("В initData нет пользователя");
  return {
    tgId: u.id,
    firstName: u.first_name,
    lastName: u.last_name ?? undefined,
    username: u.username ?? undefined,
    photoUrl: u.photo_url ?? undefined,
    startParam: data.start_param ?? undefined,
  };
}

// ─── Bot API ──────────────────────────────────────────────────────────────

type ReplyMarkup = {
  inline_keyboard: Array<Array<{ text: string; web_app?: { url: string }; url?: string }>>;
};

export async function sendMessage(chatId: number, text: string, markup?: ReplyMarkup): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup }),
  });
  if (!res.ok) {
    console.error("telegram sendMessage failed", res.status, await res.text().catch(() => ""));
  }
}

/** Ссылка на бота с кодом входа — для сценария «открыли в обычном браузере». */
export function botStartLink(code: string): string {
  return `https://t.me/${env().TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(code)}`;
}

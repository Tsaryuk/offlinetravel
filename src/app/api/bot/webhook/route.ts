import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { joinByCode, syncUserAvatar, upsertUser } from "@/lib/repo";
import { sendMessage } from "@/lib/telegram";
import { appButton, balanceText, currentTrip, esc, help, inviteText, tripSummary, welcome } from "@/lib/bot-messages";

// Вебхук Telegram. Отвечаем 200 всегда, иначе Telegram будет ретраить.
interface TgUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name: string; last_name?: string; username?: string };
    text?: string;
  };
}

type From = NonNullable<NonNullable<TgUpdate["message"]>["from"]>;

export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && req.headers.get("x-telegram-bot-api-secret-token") !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg?.from || !msg.text) return NextResponse.json({ ok: true });

  try {
    await handleMessage(msg.chat.id, msg.from, msg.text);
  } catch (e) {
    console.error("webhook error", e);
    await sendMessage(msg.chat.id, "Что-то пошло не так. Попробуйте ещё раз через минуту.").catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

async function handleMessage(chatId: number, from: From, text: string) {
  const appUrl = env().APP_URL;
  const [rawCmd, arg] = text.trim().split(/\s+/, 2);
  const cmd = rawCmd.toLowerCase().replace(/@.*$/, ""); // /help@botname → /help

  const user = await upsertUser({
    tgId: from.id,
    firstName: from.first_name,
    lastName: from.last_name,
    username: from.username,
  });
  syncUserAvatar(user).catch(() => null);

  if (cmd === "/start") {
    // /start join_<code> — зачисляем сразу, без второго нажатия
    const joinCode = arg?.startsWith("join_") ? arg.slice(5) : null;
    if (joinCode) {
      try {
        const trip = await joinByCode(from.id, joinCode);
        await sendMessage(
          chatId,
          `Вы в поездке <b>${esc(trip.name)}</b>.\n\nВнутри — расписание, места, снаряжение и общие расходы. Открывайте.`,
          appButton("Открыть поездку", `${appUrl}/t/${trip.id}`),
        );
      } catch {
        await sendMessage(chatId, "Приглашение не подошло — возможно, ссылка устарела. Попросите организатора прислать новую.", appButton("Открыть приложение", appUrl));
      }
      return;
    }

    // /start <10 hex> — подтверждение входа из браузера
    if (arg && /^[a-f0-9]{10}$/.test(arg)) {
      const res = await db()
        .from("auth_codes")
        .update({ tg_id: from.id, claimed_at: new Date().toISOString() })
        .eq("code", arg)
        .is("claimed_at", null)
        .gt("expires_at", new Date().toISOString())
        .select("code");
      await sendMessage(chatId, !res.error && res.data?.length
        ? "Готово — возвращайтесь в браузер, вход подтверждён."
        : "Код не подошёл или устарел. Обновите страницу и попробуйте ещё раз.");
      return;
    }

    await sendMessage(chatId, welcome(from.first_name), appButton("Открыть приложение", appUrl));
    return;
  }

  if (cmd === "/help") {
    await sendMessage(chatId, help(), appButton("Открыть приложение", appUrl));
    return;
  }

  if (cmd === "/app") {
    const trip = await currentTrip(from.id);
    await sendMessage(chatId, trip ? `Поездка <b>${esc(trip.name)}</b>` : "Открываю приложение.",
      appButton("Открыть", trip ? `${appUrl}/t/${trip.id}` : appUrl));
    return;
  }

  if (cmd === "/trip" || cmd === "/balance" || cmd === "/invite") {
    const trip = await currentTrip(from.id);
    if (!trip) {
      await sendMessage(chatId, "Вы пока не участвуете ни в одной поездке. Создайте свою или откройте ссылку-приглашение.", appButton("Открыть приложение", appUrl));
      return;
    }
    const body = cmd === "/trip"
      ? await tripSummary(trip.id, from.id)
      : cmd === "/balance"
        ? await balanceText(trip.id, from.id)
        : inviteText(trip);
    await sendMessage(chatId, body, appButton("Открыть поездку", `${appUrl}/t/${trip.id}`));
    return;
  }

  await sendMessage(chatId, "Не знаю такой команды. Посмотрите /help — там всё, что я умею.", appButton("Открыть приложение", appUrl));
}

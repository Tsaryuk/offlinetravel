import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { joinByCode, syncUserAvatar, upsertUser } from "@/lib/repo";
import { sendMessage } from "@/lib/telegram";

// Вебхук Telegram. Telegram шлёт сюда обновления; отвечаем всегда 200,
// иначе Telegram будет ретраить.
interface TgUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name: string; last_name?: string; username?: string };
    text?: string;
  };
}

export async function POST(req: Request) {
  // Секрет вебхука: Telegram присылает его в заголовке, если задан при setWebhook.
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
  }
  return NextResponse.json({ ok: true });
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function handleMessage(
  chatId: number,
  from: NonNullable<TgUpdate["message"]>["from"] & object,
  text: string,
) {
  const appUrl = env().APP_URL;
  const [cmd, arg] = text.trim().split(/\s+/, 2);

  if (cmd === "/start") {
    const u = await upsertUser({
      tgId: from.id,
      firstName: from.first_name,
      lastName: from.last_name,
      username: from.username,
    });
    await syncUserAvatar(u).catch(() => null);

    // /start <code> — подтверждение входа из браузера
    if (arg && /^[a-f0-9]{10}$/.test(arg)) {
      const res = await db()
        .from("auth_codes")
        .update({ tg_id: from.id, claimed_at: new Date().toISOString() })
        .eq("code", arg)
        .is("claimed_at", null)
        .gt("expires_at", new Date().toISOString())
        .select("code");
      if (!res.error && res.data?.length) {
        await sendMessage(chatId, "Готово — возвращайтесь в браузер, вход подтверждён.");
        return;
      }
      await sendMessage(chatId, "Код не подошёл или устарел. Обновите страницу и попробуйте ещё раз.");
      return;
    }

    // /start join_<code> — зачисляем в поездку сразу, не заставляя нажимать ещё одну кнопку
    const joinCode = arg?.startsWith("join_") ? arg.slice(5) : null;
    if (joinCode) {
      try {
        const trip = await joinByCode(from.id, joinCode);
        await sendMessage(chatId, `Вы в поездке <b>${escapeHtml(trip.name)}</b>. Открывайте — расписание, места и расходы уже там.`, {
          inline_keyboard: [[{ text: "Открыть поездку", web_app: { url: `${appUrl}/t/${trip.id}` } }]],
        });
      } catch {
        await sendMessage(chatId, "Приглашение не подошло — возможно, ссылка устарела. Попросите организатора прислать новую.", {
          inline_keyboard: [[{ text: "Открыть приложение", web_app: { url: appUrl } }]],
        });
      }
      return;
    }

    await sendMessage(chatId, "Offline.Travel — расписание, места и общие расходы поездки в одном месте.", {
      inline_keyboard: [[{ text: "Открыть приложение", web_app: { url: appUrl } }]],
    });
    return;
  }

  await sendMessage(chatId, "Нажмите кнопку ниже, чтобы открыть приложение.", {
    inline_keyboard: [[{ text: "Открыть приложение", web_app: { url: appUrl } }]],
  });
}

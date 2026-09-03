import { z } from "zod";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { joinByCode, upsertUser } from "@/lib/repo";
import { setSessionCookie } from "@/lib/session";
import { verifyInitData } from "@/lib/telegram";

const Body = z.object({ initData: z.string().min(10) });

// Вход из Telegram Mini App: клиент присылает подписанный Telegram initData.
export const POST = handler(async (req) => {
  const { initData } = await parseBody(req, Body);
  let tg;
  try {
    tg = verifyInitData(initData);
  } catch (e) {
    throw new ApiError(401, `Подпись Telegram не прошла проверку: ${(e as Error).message}`);
  }
  const user = await upsertUser(tg);
  await setSessionCookie({ tgId: user.tg_id });

  // Прямая ссылка вида t.me/bot/app?startapp=join_<code>: Telegram кладёт
  // параметр в initData, и человек попадает в поездку без лишних шагов.
  let tripId: string | null = null;
  if (tg.startParam?.startsWith("join_")) {
    try {
      tripId = (await joinByCode(user.tg_id, tg.startParam.slice(5))).id;
    } catch {
      tripId = null;
    }
  }
  return ok({ user, tripId });
});

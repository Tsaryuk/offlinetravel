import { z } from "zod";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { upsertUser } from "@/lib/repo";
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
  return ok({ user });
});

import { randomBytes } from "node:crypto";
import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { botStartLink } from "@/lib/telegram";

// Вход по обычной ссылке (вне Telegram): создаём одноразовый код,
// пользователь открывает бота с этим кодом, бот привязывает код к tg_id.
export const POST = handler(async () => {
  const code = randomBytes(5).toString("hex");
  const res = await db().from("auth_codes").insert({ code }).select("code").single();
  if (res.error) throw new ApiError(500, res.error.message);
  return ok({ code, link: botStartLink(code) });
});

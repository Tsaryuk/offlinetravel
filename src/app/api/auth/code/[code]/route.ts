import { handler, ok, ApiError, type Params } from "@/lib/api";
import { db } from "@/lib/db";
import { getUser } from "@/lib/repo";
import { setSessionCookie } from "@/lib/session";

// Клиент опрашивает, пока бот не подтвердит код. При подтверждении — ставим сессию.
export const GET = handler(async (_req, { params }: Params<{ code: string }>) => {
  const { code } = await params;
  const res = await db().from("auth_codes").select("tg_id, claimed_at, expires_at").eq("code", code).maybeSingle();
  if (res.error) throw new ApiError(500, res.error.message);
  if (!res.data) throw new ApiError(404, "Код не найден");
  if (new Date(res.data.expires_at) < new Date()) throw new ApiError(410, "Код устарел, запросите новый");
  if (!res.data.claimed_at || !res.data.tg_id) return ok({ claimed: false });

  const user = await getUser(res.data.tg_id);
  await setSessionCookie({ tgId: user.tg_id });
  // Код одноразовый.
  await db().from("auth_codes").delete().eq("code", code);
  return ok({ claimed: true, user });
});

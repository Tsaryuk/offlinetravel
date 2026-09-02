import { z } from "zod";
import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { joinByCode } from "@/lib/repo";

const Body = z.object({ code: z.string().regex(/^[a-f0-9]{12}$/, "Неверный код приглашения") });

export const POST = handler(async (req) => {
  const tgId = await requireUser();
  const { code } = await parseBody(req, Body);
  const trip = await joinByCode(tgId, code);
  return ok({ trip });
});

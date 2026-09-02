import { z } from "zod";
import { handler, ok, parseBody, requireAdmin, requireMember, ApiError, type Params } from "@/lib/api";
import { db } from "@/lib/db";

type P = Params<{ id: string; tgId: string }>;
const Body = z.object({ role: z.enum(["admin", "member"]).optional(), display_name: z.string().trim().max(60).optional() });

export const PATCH = handler(async (req, { params }: P) => {
  const { id, tgId: raw } = await params;
  const target = Number(raw);
  const m = await requireMember(id);
  const body = await parseBody(req, Body);

  // Роль меняет только организатор; своё отображаемое имя — любой участник.
  if (body.role !== undefined) requireAdmin(m);
  if (body.display_name !== undefined && target !== m.tgId) requireAdmin(m);
  if (body.role === "member" && target === m.tgId) {
    const admins = await db().from("members").select("tg_id").eq("trip_id", id).eq("role", "admin");
    if (!admins.error && (admins.data?.length ?? 0) <= 1) throw new ApiError(400, "Нельзя снять единственного организатора");
  }

  const res = await db().from("members").update(body).eq("trip_id", id).eq("tg_id", target).select("*, user:users(*)").single();
  if (res.error) throw new ApiError(500, res.error.message);
  return ok({ member: res.data });
});

export const DELETE = handler(async (_req, { params }: P) => {
  const { id, tgId: raw } = await params;
  const target = Number(raw);
  const m = await requireMember(id);
  requireAdmin(m);
  if (target === m.tgId) throw new ApiError(400, "Чтобы выйти самому, используйте «Покинуть поездку»");
  const res = await db().from("members").delete().eq("trip_id", id).eq("tg_id", target);
  if (res.error) throw new ApiError(500, res.error.message);
  return ok({ removed: target });
});

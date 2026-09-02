import { handler, ok, parseBody, requireAdmin, requireMember, ApiError, type Params } from "@/lib/api";
import { loadBundle } from "@/lib/repo";
import { TripInput, type Trip } from "@/lib/types";
import { db } from "@/lib/db";

type P = Params<{ id: string }>;

export const GET = handler(async (_req, { params }: P) => {
  const { id } = await params;
  const m = await requireMember(id);
  return ok(await loadBundle(id, m.tgId));
});

export const PATCH = handler(async (req, { params }: P) => {
  const { id } = await params;
  const m = await requireMember(id);
  requireAdmin(m);
  const input = await parseBody(req, TripInput.partial());
  const res = await db().from("trips").update(input).eq("id", id).select("*").single();
  if (res.error) throw new ApiError(500, res.error.message);
  return ok({ trip: res.data as Trip });
});

export const DELETE = handler(async (_req, { params }: P) => {
  const { id } = await params;
  const m = await requireMember(id);
  // Выход из поездки. Организатор не может выйти, пока он единственный админ.
  if (m.role === "admin") {
    const admins = await db().from("members").select("tg_id").eq("trip_id", id).eq("role", "admin");
    if (!admins.error && (admins.data?.length ?? 0) <= 1) {
      throw new ApiError(400, "Назначьте другого организатора, прежде чем выходить");
    }
  }
  const res = await db().from("members").delete().eq("trip_id", id).eq("tg_id", m.tgId);
  if (res.error) throw new ApiError(500, res.error.message);
  return ok({ left: true });
});


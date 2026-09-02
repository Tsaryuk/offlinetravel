import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { db } from "./db";
import { readSession } from "./session";

// Единый формат ответа API: { ok, data, error }
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data, error: null }, init);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, data: null, error: message }, { status });
}

/** Оборачивает обработчик: ловит ApiError/ZodError и отдаёт единый формат. */
export function handler<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message);
      if (e instanceof ZodError) {
        const msg = e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
        return fail(400, msg);
      }
      console.error("api error", e);
      return fail(500, "Внутренняя ошибка сервера");
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const json = await req.json().catch(() => {
    throw new ApiError(400, "Тело запроса должно быть JSON");
  });
  return schema.parse(json);
}

export async function requireUser(): Promise<number> {
  const s = await readSession();
  if (!s) throw new ApiError(401, "Нужно войти");
  return s.tgId;
}

export interface Membership {
  tgId: number;
  tripId: string;
  role: "admin" | "member";
}

export async function requireMember(tripId: string): Promise<Membership> {
  const tgId = await requireUser();
  const { data, error } = await db()
    .from("members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("tg_id", tgId)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(403, "Вы не участник этой поездки");
  return { tgId, tripId, role: data.role };
}

export function requireAdmin(m: Membership): void {
  if (m.role !== "admin") throw new ApiError(403, "Только организатор может это делать");
}

/** Параметры динамического сегмента в Next 15+ приходят промисом. */
export type Params<T> = { params: Promise<T> };

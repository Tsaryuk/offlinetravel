import { db } from "./db";
import { ApiError } from "./api";
import type { TgUser } from "./telegram";
import type { Expense, GearItem, Member, Split, Trip, TripBundle, User } from "./types";
import { ratesFor } from "./rates";
import { syncAvatar } from "./avatar";

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new ApiError(500, `${what}: ${res.error.message}`);
  if (res.data === null || res.data === undefined) throw new ApiError(404, `${what}: не найдено`);
  return res.data;
}

// ─── Пользователи ─────────────────────────────────────────────────────────

export async function upsertUser(u: TgUser): Promise<User> {
  // photo_url не трогаем: там лежит наша выгруженная копия, а ссылка из Telegram
  // живёт недолго. Обновляет её только syncUserAvatar.
  const res = await db()
    .from("users")
    .upsert(
      {
        tg_id: u.tgId,
        first_name: u.firstName,
        last_name: u.lastName ?? null,
        username: u.username ?? null,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "tg_id" },
    )
    .select("*")
    .single();
  return must(res, "users.upsert");
}

/** Подтягивает аватарку из Telegram в наш storage. Тихо ничего не делает, если фото нет. */
export async function syncUserAvatar(user: User): Promise<string | null> {
  const fresh = await syncAvatar(user.tg_id, user.photo_file_id ?? null);
  if (!fresh) return null;
  const res = await db()
    .from("users")
    .update({ photo_url: fresh.url, photo_file_id: fresh.fileId })
    .eq("tg_id", user.tg_id)
    .select("photo_url")
    .single();
  return res.error ? null : (res.data.photo_url as string);
}

export async function getUser(tgId: number): Promise<User> {
  return must(await db().from("users").select("*").eq("tg_id", tgId).maybeSingle(), "users.get");
}

export async function updateUser(tgId: number, patch: Partial<User>): Promise<User> {
  return must(await db().from("users").update(patch).eq("tg_id", tgId).select("*").single(), "users.update");
}

// ─── Поездки ──────────────────────────────────────────────────────────────

export async function listTripsFor(tgId: number): Promise<Array<Trip & { role: string }>> {
  const res = await db()
    .from("members")
    .select("role, trip:trips(*)")
    .eq("tg_id", tgId)
    .order("joined_at", { ascending: false });
  const rows = must(res, "trips.list") as unknown as Array<{ role: string; trip: Trip }>;
  return rows.filter((r) => r.trip).map((r) => ({ ...r.trip, role: r.role }));
}

export async function createTrip(tgId: number, input: Omit<Trip, "id" | "invite_code" | "created_by" | "created_at">): Promise<Trip> {
  const trip = must(await db().from("trips").insert({ ...input, created_by: tgId }).select("*").single(), "trips.insert") as Trip;
  must(await db().from("members").insert({ trip_id: trip.id, tg_id: tgId, role: "admin" }).select("trip_id").single(), "members.insert");
  return trip;
}

export async function joinByCode(tgId: number, code: string): Promise<Trip> {
  const trip = must(await db().from("trips").select("*").eq("invite_code", code).maybeSingle(), "trips.byCode") as Trip;
  const res = await db()
    .from("members")
    .upsert({ trip_id: trip.id, tg_id: tgId }, { onConflict: "trip_id,tg_id", ignoreDuplicates: true })
    .select("trip_id");
  if (res.error) throw new ApiError(500, res.error.message);
  return trip;
}

export async function loadBundle(tripId: string, tgId: number): Promise<TripBundle> {
  const [trip, membersRes, places, schedule, expensesRes, splitsRes, settlements, gear] = await Promise.all([
    db().from("trips").select("*").eq("id", tripId).maybeSingle(),
    db().from("members").select("*, user:users(*)").eq("trip_id", tripId).order("joined_at"),
    db().from("places").select("*").eq("trip_id", tripId).order("sort_order").order("name"),
    db().from("schedule").select("*").eq("trip_id", tripId).order("day").order("time_start").order("sort_order"),
    db().from("expenses").select("*").eq("trip_id", tripId).order("expense_date", { ascending: false }).order("created_at", { ascending: false }),
    db().from("splits").select("*, expense:expenses!inner(trip_id)").eq("expense.trip_id", tripId),
    db().from("settlements").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
    db().from("gear_items").select("*").eq("trip_id", tripId).order("sort_order").order("created_at"),
  ]);

  const members = must(membersRes, "members") as Member[];
  const me = members.find((m) => m.tg_id === tgId);
  if (!me) throw new ApiError(403, "Вы не участник этой поездки");

  const splitsByExpense = new Map<string, Split[]>();
  for (const s of must(splitsRes, "splits") as Array<Split & { expense?: unknown }>) {
    const list = splitsByExpense.get(s.expense_id) ?? [];
    list.push({ id: s.id, expense_id: s.expense_id, tg_id: s.tg_id, amount: Number(s.amount) });
    splitsByExpense.set(s.expense_id, list);
  }
  const expenses = (must(expensesRes, "expenses") as Omit<Expense, "splits">[]).map((e) => ({
    ...e,
    amount: Number(e.amount),
    splits: splitsByExpense.get(e.id) ?? [],
  }));

  const tripRow = must(trip, "trip") as Trip;
  return {
    trip: tripRow,
    me: { tg_id: tgId, role: me.role },
    members,
    places: must(places, "places"),
    schedule: must(schedule, "schedule"),
    expenses,
    settlements: (must(settlements, "settlements") as Array<Record<string, unknown>>).map((s) => ({ ...s, amount: Number(s.amount) })) as TripBundle["settlements"],
    gear: must(gear, "gear") as GearItem[],
    rates: await ratesFor(tripRow.base_currency),
  };
}

// ─── Расходы ──────────────────────────────────────────────────────────────

export async function insertExpense(
  tripId: string,
  tgId: number,
  input: Record<string, unknown>,
  splits: Array<{ tg_id: number; amount: number }>,
): Promise<Expense> {
  const clientId = (input.client_id as string | null | undefined) ?? null;
  if (clientId) {
    // Идемпотентность для офлайн-очереди: повтор с тем же client_id возвращает уже созданное.
    const existing = await db().from("expenses").select("*").eq("client_id", clientId).maybeSingle();
    if (existing.data) return withSplits(existing.data as Omit<Expense, "splits">);
  }
  const row = must(
    await db().from("expenses").insert({ ...input, trip_id: tripId, created_by: tgId }).select("*").single(),
    "expenses.insert",
  ) as Omit<Expense, "splits">;
  if (splits.length) {
    must(await db().from("splits").insert(splits.map((s) => ({ ...s, expense_id: row.id }))).select("id"), "splits.insert");
  }
  return withSplits(row);
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  input: Record<string, unknown>,
  splits: Array<{ tg_id: number; amount: number }>,
): Promise<Expense> {
  const patch = { ...input };
  delete patch.client_id;
  const row = must(
    await db().from("expenses").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", expenseId).eq("trip_id", tripId).select("*").single(),
    "expenses.update",
  ) as Omit<Expense, "splits">;
  const del = await db().from("splits").delete().eq("expense_id", expenseId);
  if (del.error) throw new ApiError(500, del.error.message);
  if (splits.length) {
    must(await db().from("splits").insert(splits.map((s) => ({ ...s, expense_id: row.id }))).select("id"), "splits.insert");
  }
  return withSplits(row);
}

export async function getExpenseOwner(tripId: string, expenseId: string): Promise<number | null> {
  const res = await db().from("expenses").select("created_by, paid_by").eq("id", expenseId).eq("trip_id", tripId).maybeSingle();
  if (res.error) throw new ApiError(500, res.error.message);
  if (!res.data) throw new ApiError(404, "Расход не найден");
  return (res.data.created_by as number | null) ?? (res.data.paid_by as number);
}

export async function deleteRow(table: string, tripId: string, id: string): Promise<void> {
  const res = await db().from(table).delete().eq("id", id).eq("trip_id", tripId);
  if (res.error) throw new ApiError(500, res.error.message);
}

async function withSplits(row: Omit<Expense, "splits">): Promise<Expense> {
  const splits = must(await db().from("splits").select("*").eq("expense_id", row.id), "splits.get") as Split[];
  return { ...row, amount: Number(row.amount), splits: splits.map((s) => ({ ...s, amount: Number(s.amount) })) };
}

// ─── Универсальные insert/update с идемпотентностью ───────────────────────

export async function insertRow<T>(table: string, tripId: string, values: Record<string, unknown>): Promise<T> {
  const clientId = values.client_id as string | null | undefined;
  if (clientId) {
    const existing = await db().from(table).select("*").eq("client_id", clientId).maybeSingle();
    if (existing.data) return existing.data as T;
  }
  return must(await db().from(table).insert({ ...values, trip_id: tripId }).select("*").single(), `${table}.insert`) as T;
}

export async function updateRow<T>(table: string, tripId: string, id: string, values: Record<string, unknown>): Promise<T> {
  return must(await db().from(table).update(values).eq("id", id).eq("trip_id", tripId).select("*").single(), `${table}.update`) as T;
}

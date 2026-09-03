import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendDebtReminders } from "@/lib/reminders";
import { broadcast, reminderDayBefore, reminderStartDay } from "@/lib/bot-messages";
import { localISO } from "@/lib/dates";

// Ежедневный крон Vercel (7 утра). Три вида напоминаний:
// за день до старта, утром в день старта и итоги по деньгам на следующий день после конца.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const today = localISO();
  const shift = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return localISO(d);
  };

  const appUrl = env().APP_URL;
  const done: Array<{ kind: string; trip: string; sent: number }> = [];

  // 1. Завтра выходим
  for (const t of await tripsWhere("start_date", shift(1))) {
    done.push({ kind: "за день до старта", trip: t.id, sent: await broadcast(t.id, (tgId) => reminderDayBefore(t.id, tgId), `${appUrl}/t/${t.id}/gear`) });
  }

  // 2. Сегодня стартуем
  for (const t of await tripsWhere("start_date", today)) {
    done.push({ kind: "день старта", trip: t.id, sent: await broadcast(t.id, (tgId) => reminderStartDay(t.id, tgId), `${appUrl}/t/${t.id}`) });
  }

  // 3. Итоги по долгам на следующий день после окончания
  for (const t of await tripsWhere("end_date", shift(-1))) {
    if (!t.created_by) continue;
    try {
      done.push({ kind: "итоги по долгам", trip: t.id, sent: await sendDebtReminders(t.id, t.created_by) });
    } catch (e) {
      console.error("debt reminders failed", t.id, e);
    }
  }

  return NextResponse.json({ ok: true, data: done, error: null });
}

async function tripsWhere(field: "start_date" | "end_date", value: string): Promise<Array<{ id: string; created_by: number | null }>> {
  const res = await db().from("trips").select("id, created_by").eq(field, value);
  if (res.error) {
    console.error("cron trips query failed", res.error.message);
    return [];
  }
  return (res.data ?? []) as Array<{ id: string; created_by: number | null }>;
}

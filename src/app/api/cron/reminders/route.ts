import { NextResponse } from "next/server";
import { sendDebtReminders, tripsEndedYesterday } from "@/lib/reminders";

// Ежедневный крон Vercel: на следующий день после окончания поездки
// разослать итоги по долгам. Vercel присылает Authorization: Bearer <CRON_SECRET>.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const trips = await tripsEndedYesterday();
  const results: Array<{ id: string; sent: number; error?: string }> = [];
  for (const t of trips) {
    if (!t.created_by) continue;
    try {
      results.push({ id: t.id, sent: await sendDebtReminders(t.id, t.created_by) });
    } catch (e) {
      results.push({ id: t.id, sent: 0, error: (e as Error).message });
    }
  }
  return NextResponse.json({ ok: true, data: results, error: null });
}

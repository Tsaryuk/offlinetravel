import { db } from "./db";
import { env } from "./env";
import { ApiError } from "./api";
import { loadBundle } from "./repo";
import { sendMessage } from "./telegram";
import { calcBalances, calcSettlements } from "./balances";
import { fmtMoney } from "./money";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Рассылает участникам поездки напоминания о долгах в Telegram.
 * Должникам — кому и сколько вернуть с реквизитами получателя;
 * кредиторам — от кого ждать. Возвращает число отправленных сообщений.
 */
export async function sendDebtReminders(tripId: string, requesterTgId: number): Promise<number> {
  const b = await loadBundle(tripId, requesterTgId);
  const balances = calcBalances(b.members.map((m) => m.tg_id), b.expenses, b.settlements, b.trip.base_currency, b.rates);
  const transfers = calcSettlements(balances);
  if (!transfers.length) return 0;

  const name = (id: number) => {
    const m = b.members.find((x) => x.tg_id === id);
    return m?.display_name || m?.user?.first_name || "участник";
  };
  const payInfo = (id: number) => {
    const u = b.members.find((x) => x.tg_id === id)?.user;
    const parts = [u?.phone && `СБП: ${u.phone}`, u?.pay_note].filter(Boolean);
    return parts.length ? `\n   ${esc(parts.join(" · "))}` : "";
  };
  const cur = b.trip.base_currency;
  const url = `${env().APP_URL}/t/${tripId}/expenses?tab=balance`;
  const markup = { inline_keyboard: [[{ text: "Открыть расчёты", web_app: { url } }]] };

  const byUser = new Map<number, string[]>();
  for (const t of transfers) {
    byUser.set(t.from, [...(byUser.get(t.from) ?? []), `→ <b>${esc(name(t.to))}</b>: ${fmtMoney(t.amount, cur)}${payInfo(t.to)}`]);
    byUser.set(t.to, [...(byUser.get(t.to) ?? []), `← <b>${esc(name(t.from))}</b>: ${fmtMoney(t.amount, cur)}`]);
  }

  let sent = 0;
  for (const [tgId, lines] of byUser) {
    const owes = lines.filter((l) => l.startsWith("→"));
    const gets = lines.filter((l) => l.startsWith("←"));
    const text = [
      `<b>${esc(b.trip.name)}</b> — итоги по расходам`,
      owes.length ? `\nВам нужно вернуть:\n${owes.join("\n")}` : "",
      gets.length ? `\nВам должны:\n${gets.join("\n")}` : "",
      `\nКогда деньги получены — отметьте это в приложении, и баланс закроется.`,
    ].join("\n");
    await sendMessage(tgId, text, markup);
    sent++;
  }
  return sent;
}

/** Поездки, закончившиеся вчера — для ежедневного крона. */
export async function tripsEndedYesterday(): Promise<Array<{ id: string; created_by: number | null }>> {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const iso = d.toISOString().slice(0, 10);
  const res = await db().from("trips").select("id, created_by").eq("end_date", iso);
  if (res.error) throw new ApiError(500, res.error.message);
  return (res.data ?? []) as Array<{ id: string; created_by: number | null }>;
}

import { db } from "./db";
import { env } from "./env";
import { loadBundle } from "./repo";
import { sendMessage } from "./telegram";
import { calcBalances, calcSettlements } from "./balances";
import { fmtMoney } from "./money";
import { dateRange, daysBetween, localISO, plural, timeShort } from "./dates";
import type { Trip } from "./types";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function appButton(text: string, url: string) {
  return { inline_keyboard: [[{ text, web_app: { url } }]] };
}

// ─── Тексты ───────────────────────────────────────────────────────────────

export function welcome(firstName: string): string {
  return [
    `Привет, ${esc(firstName)}.`,
    "",
    "Это <b>Offline.Travel</b> — помощник для поездок компанией.",
    "Здесь расписание по дням, места с маршрутами, список снаряжения и общие расходы,",
    "которые приложение само делит между всеми и считает, кто кому должен.",
    "",
    "Главное: всё работает <b>без связи</b>. Записали расход в лесу — он уйдёт на сервер,",
    "когда появится интернет.",
    "",
    "Нажмите кнопку ниже, чтобы открыть приложение.",
  ].join("\n");
}

export function help(): string {
  return [
    "<b>Что умеет бот</b>",
    "",
    "/app — открыть приложение",
    "/trip — что сейчас в поездке: даты, участники, расходы",
    "/balance — кто кому сколько должен",
    "/invite — ссылка-приглашение для участников",
    "/help — эта справка",
    "",
    "Бот сам напомнит за день до старта, утром в день выхода",
    "и пришлёт итоги по деньгам, когда поездка закончится.",
  ].join("\n");
}

/** Текущая поездка человека: последняя по дате начала среди актуальных. */
export async function currentTrip(tgId: number): Promise<Trip | null> {
  const res = await db()
    .from("members")
    .select("trip:trips(*)")
    .eq("tg_id", tgId);
  if (res.error || !res.data?.length) return null;
  const trips = res.data.map((r) => (r as unknown as { trip: Trip }).trip).filter(Boolean);
  if (!trips.length) return null;
  const today = localISO();
  // сначала идущая сейчас, потом ближайшая будущая, иначе последняя прошедшая
  const active = trips.find((t) => t.start_date <= today && t.end_date >= today);
  if (active) return active;
  const upcoming = trips.filter((t) => t.start_date > today).sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (upcoming.length) return upcoming[0];
  return trips.sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
}

export async function tripSummary(tripId: string, tgId: number): Promise<string> {
  const b = await loadBundle(tripId, tgId);
  const today = localISO();
  const total = b.expenses.filter((e) => e.op_type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const left = daysBetween(today, b.trip.start_date);
  const when = today < b.trip.start_date
    ? (left === 0 ? "старт сегодня" : left === 1 ? "старт завтра" : `до старта ${left} ${plural(left, "день", "дня", "дней")}`)
    : today > b.trip.end_date
      ? "поездка завершена"
      : `идёт день ${daysBetween(b.trip.start_date, today) + 1}`;

  const todayEvents = b.schedule.filter((e) => e.day === today);
  const lines = [
    `<b>${esc(b.trip.name)}</b>`,
    `${dateRange(b.trip.start_date, b.trip.end_date)} · ${when}`,
    "",
    `Участников: ${b.members.length}`,
    `Расходов: ${b.expenses.length} на ${fmtMoney(total, b.trip.base_currency)}`,
  ];
  const gearLeft = b.gear.filter((g) => !g.assignee).length;
  if (gearLeft) lines.push(`Снаряжение: ${gearLeft} ${plural(gearLeft, "предмет ещё не взят", "предмета ещё не взяты", "предметов ещё не взяты")}`);
  if (todayEvents.length) {
    lines.push("", "<b>Сегодня в расписании</b>");
    todayEvents.slice(0, 6).forEach((e) => lines.push(`${timeShort(e.time_start)} — ${esc(e.title)}`));
  }
  return lines.join("\n");
}

export async function balanceText(tripId: string, tgId: number): Promise<string> {
  const b = await loadBundle(tripId, tgId);
  const balances = calcBalances(b.members.map((m) => m.tg_id), b.expenses, b.settlements, b.trip.base_currency, b.rates);
  const transfers = calcSettlements(balances);
  const name = (id: number) => {
    const m = b.members.find((x) => x.tg_id === id);
    return esc(m?.display_name || m?.user?.first_name || "участник");
  };
  const cur = b.trip.base_currency;
  if (!transfers.length) return `<b>${esc(b.trip.name)}</b>\n\nВсе рассчитались — долгов нет.`;

  const mine = transfers.filter((t) => t.from === tgId || t.to === tgId);
  const lines = [`<b>${esc(b.trip.name)}</b>`, ""];
  if (mine.length) {
    lines.push("<b>Ваши расчёты</b>");
    for (const t of mine) {
      lines.push(t.from === tgId ? `Вы → ${name(t.to)}: ${fmtMoney(t.amount, cur)}` : `${name(t.from)} → вам: ${fmtMoney(t.amount, cur)}`);
    }
  } else {
    lines.push("У вас всё ровно.");
  }
  const others = transfers.filter((t) => t.from !== tgId && t.to !== tgId);
  if (others.length) {
    lines.push("", "<b>Остальные</b>");
    others.forEach((t) => lines.push(`${name(t.from)} → ${name(t.to)}: ${fmtMoney(t.amount, cur)}`));
  }
  return lines.join("\n");
}

export function inviteText(trip: Trip): string {
  return [
    `Ссылка-приглашение в поездку <b>${esc(trip.name)}</b>:`,
    "",
    `${inviteLink(trip.invite_code)}`,
    "",
    "Кто нажмёт — сразу окажется в поездке, ничего вводить не нужно.",
  ].join("\n");
}

export function inviteLink(code: string): string {
  return `https://t.me/${env().TELEGRAM_BOT_USERNAME}?start=join_${code}`;
}

// ─── Напоминания ──────────────────────────────────────────────────────────

/** Завтра выходим: состав, что не разобрано из снаряжения, время первого события. */
export async function reminderDayBefore(tripId: string, tgId: number): Promise<string> {
  const b = await loadBundle(tripId, tgId);
  const first = b.schedule.filter((e) => e.day === b.trip.start_date).sort((a, b2) => a.time_start.localeCompare(b2.time_start))[0];
  const lines = [`<b>${esc(b.trip.name)}</b> — завтра выходим.`, ""];
  if (first) lines.push(`Начало в ${timeShort(first.time_start)}: ${esc(first.title)}`);
  const free = b.gear.filter((g) => !g.assignee);
  if (free.length) {
    lines.push("", "Ещё никто не взял:");
    free.slice(0, 8).forEach((g) => lines.push(`— ${esc(g.title)}`));
  }
  const mine = b.gear.filter((g) => g.assignee === tgId && !g.done);
  if (mine.length) {
    lines.push("", "На вас:");
    mine.slice(0, 8).forEach((g) => lines.push(`— ${esc(g.title)}`));
  }
  lines.push("", "Проверьте список и отметьте, что собрали.");
  return lines.join("\n");
}

/** Утро старта: во сколько и где собираемся. */
export async function reminderStartDay(tripId: string, tgId: number): Promise<string> {
  const b = await loadBundle(tripId, tgId);
  const today = b.schedule.filter((e) => e.day === b.trip.start_date).sort((a, b2) => a.time_start.localeCompare(b2.time_start));
  const lines = [`<b>${esc(b.trip.name)}</b> — сегодня стартуем.`, ""];
  if (today.length) {
    lines.push("<b>План на день</b>");
    today.slice(0, 8).forEach((e) => {
      const place = e.place_id ? b.places.find((p) => p.id === e.place_id) : null;
      lines.push(`${timeShort(e.time_start)} — ${esc(e.title)}${place ? ` (${esc(place.name)})` : ""}`);
    });
  } else {
    lines.push("Расписание пока пустое — организатор ещё не заполнил.");
  }
  lines.push("", "Расходы записывайте сразу, даже без связи: приложение сохранит и отправит позже.");
  return lines.join("\n");
}

/** Рассылает всем участникам поездки один и тот же текст, собранный под каждого. */
export async function broadcast(tripId: string, build: (tgId: number) => Promise<string>, buttonUrl?: string): Promise<number> {
  const res = await db().from("members").select("tg_id").eq("trip_id", tripId);
  if (res.error || !res.data) return 0;
  let sent = 0;
  for (const { tg_id: tgId } of res.data as Array<{ tg_id: number }>) {
    try {
      const text = await build(tgId);
      await sendMessage(tgId, text, buttonUrl ? appButton("Открыть поездку", buttonUrl) : undefined);
      sent++;
    } catch (e) {
      console.error("broadcast failed", tripId, tgId, e);
    }
  }
  return sent;
}

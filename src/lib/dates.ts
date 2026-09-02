// Все даты дней поездки — локальные, в формате YYYY-MM-DD.
// Никакого toISOString(): он режет по UTC и в MSK сдвигает день (баг v1).

export function localISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export function dayLabel(iso: string): string {
  const d = parseISO(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function longDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** «8 — 11 сентября» или «30 сентября — 2 октября». */
export function dateRange(startISO: string, endISO: string): string {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (s.getMonth() === e.getMonth()) return `${s.getDate()} — ${e.getDate()} ${MONTHS_GEN[s.getMonth()]}`;
  return `${longDate(startISO)} — ${longDate(endISO)}`;
}

export function tripDays(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const end = parseISO(endISO);
  for (let d = parseISO(startISO); d <= end; d.setDate(d.getDate() + 1)) out.push(localISO(d));
  return out;
}

export function daysBetween(aISO: string, bISO: string): number {
  return Math.round((parseISO(bISO).getTime() - parseISO(aISO).getTime()) / 86_400_000);
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export type TripPhase =
  | { kind: "before"; daysLeft: number }
  | { kind: "during"; day: number; total: number }
  | { kind: "after" };

export function tripPhase(startISO: string, endISO: string, today = localISO()): TripPhase {
  const total = daysBetween(startISO, endISO) + 1;
  if (today < startISO) return { kind: "before", daysLeft: daysBetween(today, startISO) };
  if (today > endISO) return { kind: "after" };
  return { kind: "during", day: daysBetween(startISO, today) + 1, total };
}

export function phaseLabel(p: TripPhase): string {
  if (p.kind === "after") return "Завершена";
  if (p.kind === "during") return `День ${p.day} из ${p.total}`;
  if (p.daysLeft === 0) return "Старт сегодня";
  if (p.daysLeft === 1) return "Старт завтра";
  return `Старт через ${p.daysLeft} ${plural(p.daysLeft, "день", "дня", "дней")}`;
}

/** Группировка списка расходов: «Сегодня», «Вчера», иначе «Чт, 3 сен». */
export function relativeDayLabel(iso: string, today = localISO()): string {
  const diff = daysBetween(iso, today);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  return dayLabel(iso);
}

export function timeShort(t: string | null | undefined): string {
  return (t ?? "").slice(0, 5);
}

import { db } from "./db";
import { CURRENCIES, type Rates } from "./types";

// Курсы ЦБ РФ через зеркало cbr-xml-daily.ru (JSON, без ключа).
// Храним в fx_rates, обновляем не чаще раза в 12 часов; при недоступности
// источника отдаём последние сохранённые. Если сохранённых нет — пустой объект,
// и клиент честно покажет, что курса нет, а не посчитает 1:1 молча.

const SOURCE = "https://www.cbr-xml-daily.ru/daily_json.js";
const TTL_MS = 12 * 60 * 60 * 1000;

interface CbrPayload {
  Valute: Record<string, { Nominal: number; Value: number }>;
}

let memo: { at: number; rub: Record<string, number> } | null = null;

/** Курсы всех поддерживаемых валют к рублю: 1 единица валюты = N рублей. */
export async function rubRates(): Promise<Record<string, number>> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.rub;

  const stored = await db().from("fx_rates").select("code, rub, fetched_at");
  const rows = stored.data ?? [];
  const freshest = rows.reduce((m, r) => Math.max(m, new Date(r.fetched_at as string).getTime()), 0);
  const fromDb = Object.fromEntries(rows.map((r) => [r.code as string, Number(r.rub)]));

  if (rows.length && Date.now() - freshest < TTL_MS) {
    memo = { at: freshest, rub: { RUB: 1, ...fromDb } };
    return memo.rub;
  }

  try {
    const res = await fetch(SOURCE, { next: { revalidate: 0 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`cbr ${res.status}`);
    const json = (await res.json()) as CbrPayload;
    const rub: Record<string, number> = { RUB: 1 };
    for (const code of CURRENCIES) {
      const v = json.Valute[code];
      if (v && v.Nominal > 0) rub[code] = v.Value / v.Nominal;
    }
    const now = new Date().toISOString();
    await db()
      .from("fx_rates")
      .upsert(Object.entries(rub).filter(([c]) => c !== "RUB").map(([code, r]) => ({ code, rub: r, fetched_at: now })), { onConflict: "code" });
    memo = { at: Date.now(), rub };
    return rub;
  } catch (e) {
    console.error("fx rates fetch failed, using stored", e);
    memo = { at: Date.now() - TTL_MS + 60_000, rub: { RUB: 1, ...fromDb } }; // повторить через минуту
    return memo.rub;
  }
}

/** Курсы к базовой валюте поездки. */
export async function ratesFor(base: string): Promise<Rates> {
  const rub = await rubRates();
  const baseRub = rub[base];
  if (!baseRub) return {};
  const out: Rates = {};
  for (const [code, r] of Object.entries(rub)) out[code] = r / baseRub;
  return out;
}

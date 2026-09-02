import type { Currency } from "./types";

export const CUR_SYM: Record<Currency, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  THB: "฿",
  TRY: "₺",
  GEL: "₾",
};

export function fmtMoney(n: number, cur: string = "RUB", opts: { sign?: boolean } = {}): string {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded).toLocaleString("ru-RU");
  const sym = CUR_SYM[cur as Currency] ?? cur;
  const sign = rounded < 0 ? "−" : opts.sign && rounded > 0 ? "+" : "";
  return `${sign}${abs} ${sym}`;
}

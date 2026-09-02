import type { ReceiptItem } from "./types";

/**
 * Считает доли по позициям чека: каждая позиция делится поровну между теми,
 * кто в ней отмечен; пустая отметка — между всеми участниками расхода.
 * Разница между итогом чека и суммой позиций (сервисный сбор, округление)
 * раскидывается поровну на всех. Всё в копейках, чтобы сходилось до рубля.
 */
export function splitByItems(items: ReceiptItem[], total: number, everyone: number[]): Record<number, number> {
  const cents: Record<number, number> = {};
  everyone.forEach((id) => (cents[id] = 0));
  const add = (id: number, c: number) => (cents[id] = (cents[id] ?? 0) + c);

  let itemsTotal = 0;
  for (const it of items) {
    const who = it.for.length ? it.for.filter((id) => everyone.includes(id)) : everyone;
    if (!who.length) continue;
    const c = Math.round(it.sum * 100);
    itemsTotal += c;
    const each = Math.floor(c / who.length);
    let rest = c - each * who.length;
    for (const id of who) {
      add(id, each + (rest > 0 ? 1 : 0));
      if (rest > 0) rest--;
    }
  }

  const diff = Math.round(total * 100) - itemsTotal;
  if (diff !== 0 && everyone.length) {
    const each = Math.trunc(diff / everyone.length);
    let rest = diff - each * everyone.length;
    for (const id of everyone) {
      add(id, each + (rest !== 0 ? Math.sign(rest) : 0));
      if (rest !== 0) rest -= Math.sign(rest);
    }
  }

  const out: Record<number, number> = {};
  for (const [id, c] of Object.entries(cents)) out[Number(id)] = Math.max(0, c) / 100;
  return out;
}

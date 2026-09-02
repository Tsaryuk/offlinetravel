"use client";

// Демо-режим (NEXT_PUBLIC_DEMO=1): вместо сервера — поход «Дорога в Лавру» в памяти.
// Нужен для просмотра интерфейса до подключения базы. В прод-сборке не участвует.

import { HttpError } from "./api";
import type { Expense, GearItem, Member, Message, Place, ScheduleEvent, Settlement, Trip, TripBundle, User } from "@/lib/types";

const ME = 100001;
const TRIP = "demo-lavra";

const users: Record<number, User> = {
  [ME]: { tg_id: ME, first_name: "Денис", last_name: null, username: "tsaryuk", photo_url: null, phone: "+7 900 111-22-33", city: "Москва", bio: "Организатор", dietary: null, pay_note: "Т-Банк по номеру" },
  100002: { tg_id: 100002, first_name: "Аня", last_name: null, username: "anya", photo_url: null, phone: null, city: "Питер", bio: "Снимает на плёнку", dietary: "Вегетарианка", pay_note: "Сбер" },
  100003: { tg_id: 100003, first_name: "Марк", last_name: null, username: "mark", photo_url: null, phone: null, city: "Мурманск", bio: null, dietary: null, pay_note: null },
  100004: { tg_id: 100004, first_name: "Лиза", last_name: null, username: "liza", photo_url: null, phone: null, city: "Казань", bio: null, dietary: "Без глютена", pay_note: null },
  100005: { tg_id: 100005, first_name: "Игорь", last_name: null, username: null, photo_url: null, phone: null, city: null, bio: null, dietary: null, pay_note: null },
};

const trip: Trip = {
  id: TRIP, name: "Дорога в Лавру", start_date: "2026-09-08", end_date: "2026-09-11",
  description: "Пеший поход, старт 8 сентября в 8:00 от Ярославского вокзала", base_currency: "RUB",
  invite_code: "a1b2c3d4e5f6", created_by: ME, created_at: "2026-08-20T10:00:00Z",
};

const members: Member[] = Object.values(users).map((u, i) => ({
  trip_id: TRIP, tg_id: u.tg_id, role: u.tg_id === ME ? "admin" : "member", display_name: null, joined_at: `2026-08-2${i}T10:00:00Z`, user: u,
}));

const places: Place[] = [
  { id: "p1", trip_id: TRIP, name: "Старт — Ярославский вокзал", address: "Москва, Комсомольская пл., 5", lat: 55.7766, lng: 37.657, description: "Сбор у памятника в 7:40", map_url: null, photo_url: null, category: "transport", sort_order: 1 },
  { id: "p2", trip_id: TRIP, name: "Ночёвка 1 — поле у Радонежа", address: "Радонеж, у источника", lat: 56.238, lng: 38.048, description: "Вода в источнике, дрова взять с собой", map_url: null, photo_url: null, category: "housing", sort_order: 2 },
  { id: "p3", trip_id: TRIP, name: "Хотьково, Покровский монастырь", address: "Хотьково, Кооперативная ул., 2", lat: 56.2536, lng: 37.9975, description: "Трапезная до 17:00", map_url: null, photo_url: null, category: "food", sort_order: 3 },
  { id: "p4", trip_id: TRIP, name: "Ночёвка 2 — гостевой дом", address: "Сергиев Посад, ул. Вознесенская, 12", lat: 56.31, lng: 38.133, description: "Забронировано на 5 человек", map_url: null, photo_url: null, category: "housing", sort_order: 4 },
  { id: "p5", trip_id: TRIP, name: "Троице-Сергиева Лавра", address: "Сергиев Посад", lat: 56.3105, lng: 38.13, description: "Финиш маршрута", map_url: null, photo_url: null, category: "sight", sort_order: 5 },
];

const schedule: ScheduleEvent[] = [
  { id: "s1", trip_id: TRIP, day: "2026-09-08", time_start: "08:00", time_end: "08:30", title: "Старт", description: "Сбор у Ярославского вокзала", place_id: "p1", sort_order: 1 },
  { id: "s2", trip_id: TRIP, day: "2026-09-08", time_start: "09:15", time_end: "10:00", title: "Электричка до Мытищ", description: null, place_id: null, sort_order: 2 },
  { id: "s3", trip_id: TRIP, day: "2026-09-08", time_start: "10:00", time_end: "18:00", title: "Переход до Радонежа", description: "22 км, обед на привале", place_id: "p2", sort_order: 3 },
  { id: "s4", trip_id: TRIP, day: "2026-09-09", time_start: "08:00", time_end: "09:00", title: "Завтрак и сборы", description: null, place_id: null, sort_order: 1 },
  { id: "s5", trip_id: TRIP, day: "2026-09-09", time_start: "09:00", time_end: "17:00", title: "Переход до Хотьково", description: "18 км", place_id: "p3", sort_order: 2 },
  { id: "s6", trip_id: TRIP, day: "2026-09-10", time_start: "09:00", time_end: "15:00", title: "Переход до Сергиева Посада", description: "12 км", place_id: "p4", sort_order: 1 },
  { id: "s7", trip_id: TRIP, day: "2026-09-11", time_start: "09:00", time_end: "12:00", title: "Лавра", description: "Финиш", place_id: "p5", sort_order: 1 },
  { id: "s8", trip_id: TRIP, day: "2026-09-11", time_start: "14:00", time_end: null, title: "Электричка в Москву", description: null, place_id: null, sort_order: 2 },
];

const all = members.map((m) => m.tg_id);
const equal = (id: string, amount: number, ids = all) => ids.map((tg, i) => ({ id: `${id}_${i}`, expense_id: id, tg_id: tg, amount: Math.round((amount / ids.length) * 100) / 100 }));

let expenses: Expense[] = [
  { id: "e1", trip_id: TRIP, op_type: "expense", paid_by: ME, transfer_to: null, amount: 12400, currency: "RUB", description: "Гостевой дом, 1 ночь", category: "housing", split_type: "equal", expense_date: "2026-09-02", photo_url: null, items: null, client_id: null, created_by: ME, created_at: "2026-09-02T15:30:00Z", splits: equal("e1", 12400) },
  { id: "e2", trip_id: TRIP, op_type: "expense", paid_by: 100003, transfer_to: null, amount: 3600, currency: "RUB", description: "Электрички туда", items: null, category: "transport", split_type: "equal", expense_date: "2026-09-02", photo_url: null, client_id: null, created_by: 100003, created_at: "2026-09-02T12:10:00Z", splits: equal("e2", 3600) },
  { id: "e3", trip_id: TRIP, op_type: "expense", paid_by: 100002, transfer_to: null, amount: 4200, currency: "RUB", description: "Продукты на маршрут", items: null, category: "groceries", split_type: "equal", expense_date: "2026-09-01", photo_url: null, client_id: null, created_by: 100002, created_at: "2026-09-01T20:40:00Z", splits: equal("e3", 4200) },
  { id: "e4", trip_id: TRIP, op_type: "expense", paid_by: 100004, transfer_to: null, amount: 1800, currency: "RUB", description: "Газ и горелка", items: null, category: "gear", split_type: "equal", expense_date: "2026-09-01", photo_url: null, client_id: null, created_by: 100004, created_at: "2026-09-01T11:00:00Z", splits: equal("e4", 1800) },
  { id: "e5", trip_id: TRIP, op_type: "transfer", paid_by: 100002, transfer_to: ME, amount: 2000, currency: "RUB", description: "", category: "transfer", split_type: "equal", expense_date: "2026-09-01", photo_url: null, items: null, client_id: null, created_by: 100002, created_at: "2026-09-01T18:00:00Z", splits: [] },
];
let settlements: Settlement[] = [];
let gear: GearItem[] = [
  { id: "g1", trip_id: TRIP, title: "Палатка", qty: "2", assignee: ME, done: true, sort_order: 0 },
  { id: "g2", trip_id: TRIP, title: "Котелок", qty: null, assignee: null, done: false, sort_order: 1 },
  { id: "g3", trip_id: TRIP, title: "Горелка и газ", qty: null, assignee: 100004, done: false, sort_order: 2 },
  { id: "g4", trip_id: TRIP, title: "Аптечка", qty: null, assignee: 100002, done: true, sort_order: 3 },
];
const rates = { RUB: 1, USD: 81.4, EUR: 94.9, THB: 2.5, TRY: 1.95, GEL: 30.1 };
let messages: Message[] = [
  { id: "m1", trip_id: TRIP, author_tg_id: 100003, author_name: undefined, text: "Прогноз на 8-е: +14 и без дождя, идём", is_pinned: false, client_id: null, created_at: "2026-09-01T18:00:00Z" } as Message,
  { id: "m2", trip_id: TRIP, author_tg_id: ME, text: "Сбор в 7:40 у памятника, электричка в 8:12. Не опаздывайте", is_pinned: true, client_id: null, created_at: "2026-09-01T19:20:00Z" },
  { id: "m3", trip_id: TRIP, author_tg_id: 100002, text: "Взяла плёнку на все дни", is_pinned: false, client_id: null, created_at: "2026-09-02T08:05:00Z" },
  { id: "m4", trip_id: TRIP, author_tg_id: 100004, text: "Кто берёт котелок? У меня только горелка", is_pinned: false, client_id: null, created_at: "2026-09-02T09:30:00Z" },
];

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

function bundle(): TripBundle {
  return { trip, me: { tg_id: ME, role: "admin" }, members, places, schedule, expenses, settlements, gear, rates };
}

export async function demoApi<T>(path: string, method: string, body: unknown): Promise<T> {
  await delay();
  const b = (body ?? {}) as Record<string, unknown>;
  const r = (v: unknown) => v as T;

  if (path === "/api/me") return r({ user: users[ME], trips: [{ ...trip, role: "admin" }] });
  if (path === "/api/auth/logout") return r({ loggedOut: true });
  if (path === `/api/trips/${TRIP}` && method === "GET") return r(bundle());
  if (path === `/api/trips/${TRIP}` && method === "PATCH") { Object.assign(trip, b); return r({ trip }); }
  if (path === "/api/trips" && method === "POST") return r({ trip: { ...trip, id: TRIP } });
  if (path === "/api/trips/join") return r({ trip });

  if (path === `/api/trips/${TRIP}/expenses` && method === "POST") {
    const input = b as unknown as Omit<Expense, "id" | "trip_id" | "created_at" | "created_by">;
    const e: Expense = { ...input, id: `e_${uid()}`, trip_id: TRIP, created_by: ME, created_at: new Date().toISOString(), splits: (input.splits ?? []).map((s, i) => ({ ...s, id: `s${i}`, expense_id: "x" })) };
    expenses = [e, ...expenses];
    return r({ expense: e });
  }
  let m = path.match(new RegExp(`^/api/trips/${TRIP}/expenses/([^/]+)$`));
  if (m) {
    if (method === "DELETE") { expenses = expenses.filter((e) => e.id !== m![1]); return r({ deleted: m[1] }); }
    const input = b as unknown as Partial<Expense>;
    expenses = expenses.map((e) => (e.id === m![1] ? { ...e, ...input, splits: (input.splits ?? e.splits).map((s, i) => ({ ...s, id: `s${i}`, expense_id: e.id })) } : e));
    return r({ expense: expenses.find((e) => e.id === m![1]) });
  }
  if (path === `/api/trips/${TRIP}/settlements`) {
    const s = { ...(b as unknown as Settlement), id: `st_${uid()}`, trip_id: TRIP, created_at: new Date().toISOString() };
    settlements = [s, ...settlements];
    return r({ settlement: s });
  }
  if (path.startsWith(`/api/trips/${TRIP}/messages`)) {
    if (method === "POST") {
      const msg: Message = { id: `m_${uid()}`, trip_id: TRIP, author_tg_id: ME, text: String(b.text), is_pinned: false, client_id: (b.client_id as string) ?? null, created_at: new Date().toISOString() };
      messages = [...messages, msg];
      return r({ message: msg });
    }
    return r({ messages });
  }
  if (path === `/api/trips/${TRIP}/places` && method === "POST") { const p = { ...(b as unknown as Place), id: `p_${uid()}`, trip_id: TRIP }; places.push(p); return r({ place: p }); }
  m = path.match(new RegExp(`^/api/trips/${TRIP}/places/([^/]+)$`));
  if (m) {
    const i = places.findIndex((p) => p.id === m![1]);
    if (method === "DELETE") { if (i >= 0) places.splice(i, 1); return r({ deleted: m[1] }); }
    if (i >= 0) places[i] = { ...places[i], ...(b as Partial<Place>) };
    return r({ place: places[i] });
  }
  if (path === `/api/trips/${TRIP}/schedule` && method === "POST") { const e = { ...(b as unknown as ScheduleEvent), id: `s_${uid()}`, trip_id: TRIP }; schedule.push(e); return r({ event: e }); }
  m = path.match(new RegExp(`^/api/trips/${TRIP}/schedule/([^/]+)$`));
  if (m) {
    const i = schedule.findIndex((e) => e.id === m![1]);
    if (method === "DELETE") { if (i >= 0) schedule.splice(i, 1); return r({ deleted: m[1] }); }
    if (i >= 0) schedule[i] = { ...schedule[i], ...(b as Partial<ScheduleEvent>) };
    return r({ event: schedule[i] });
  }
  m = path.match(new RegExp(`^/api/trips/${TRIP}/members/(\\d+)$`));
  if (m) {
    const mem = members.find((x) => x.tg_id === Number(m![1]));
    if (mem && method === "PATCH") Object.assign(mem, b);
    if (method === "DELETE") { const i = members.findIndex((x) => x.tg_id === Number(m![1])); if (i >= 0) members.splice(i, 1); }
    return r({ member: mem });
  }
  if (path === `/api/trips/${TRIP}/remind`) return r({ sent: 3 });
  if (path === `/api/trips/${TRIP}/receipt` && method === "GET") return r({ enabled: true });
  if (path === `/api/trips/${TRIP}/receipt` && method === "POST") {
    await delay(1200);
    return r({
      photo_url: String(b.image),
      receipt: {
        merchant: "Трапезная Покровского монастыря", date: "2026-09-09", currency: "RUB", total: 1840, confidence: "high", note: null,
        items: [
          { title: "Щи постные", qty: 3, sum: 660 },
          { title: "Пирог с капустой", qty: 5, sum: 600 },
          { title: "Чай травяной", qty: 5, sum: 350 },
          { title: "Квас", qty: 2, sum: 230 },
        ],
      },
    });
  }
  if (path === `/api/trips/${TRIP}/gear` && method === "POST") { const g: GearItem = { id: `g_${uid()}`, trip_id: TRIP, done: false, assignee: null, qty: null, sort_order: gear.length, ...(b as Partial<GearItem>) } as GearItem; gear = [...gear, g]; return r({ item: g }); }
  m = path.match(new RegExp(`^/api/trips/${TRIP}/gear/([^/]+)$`));
  if (m) {
    if (method === "DELETE") { gear = gear.filter((g) => g.id !== m![1]); return r({ deleted: m[1] }); }
    gear = gear.map((g) => (g.id === m![1] ? { ...g, ...(b as Partial<GearItem>) } : g));
    return r({ item: gear.find((g) => g.id === m![1]) });
  }
  if (path === "/api/me" && method === "PATCH") { Object.assign(users[ME], b); return r({ user: users[ME] }); }
  throw new HttpError(404, `Демо: нет обработчика для ${method} ${path}`);
}

import { z } from "zod";

// ─── Домен ────────────────────────────────────────────────────────────────

export const CURRENCIES = ["RUB", "USD", "EUR", "THB", "TRY", "GEL"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CATEGORIES = [
  { id: "groceries", label: "Продукты", icon: "🛒" },
  { id: "restaurants", label: "Кафе и трапезные", icon: "🍽" },
  { id: "transport", label: "Транспорт", icon: "🚆" },
  { id: "housing", label: "Ночлег", icon: "🏕" },
  { id: "gear", label: "Снаряжение", icon: "🎒" },
  { id: "tickets", label: "Билеты и сборы", icon: "🎟" },
  { id: "medical", label: "Аптечка", icon: "💊" },
  { id: "entertainment", label: "Развлечения", icon: "🎭" },
  { id: "shopping", label: "Покупки", icon: "🛍" },
  { id: "other", label: "Другое", icon: "📦" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const PLACE_CATEGORIES = [
  { id: "housing", label: "Ночлег", icon: "🏕" },
  { id: "food", label: "Еда", icon: "🍽" },
  { id: "sight", label: "Достопримечательности", icon: "⛪" },
  { id: "transport", label: "Транспорт", icon: "🚆" },
  { id: "water", label: "Вода", icon: "💧" },
  { id: "other", label: "Другое", icon: "📍" },
] as const;

export interface User {
  tg_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  phone: string | null;
  city: string | null;
  bio: string | null;
  dietary: string | null;
  pay_note: string | null;
}

export interface Trip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  description: string | null;
  base_currency: Currency;
  invite_code: string;
  created_by: number | null;
  created_at: string;
}

export interface Member {
  trip_id: string;
  tg_id: number;
  role: "admin" | "member";
  display_name: string | null;
  joined_at: string;
  user: User;
}

export interface Place {
  id: string;
  trip_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  map_url: string | null;
  photo_url: string | null;
  category: string;
  sort_order: number;
}

export interface ScheduleEvent {
  id: string;
  trip_id: string;
  day: string;
  time_start: string;
  time_end: string | null;
  title: string;
  description: string | null;
  place_id: string | null;
  sort_order: number;
}

export interface Message {
  id: string;
  trip_id: string;
  author_tg_id: number;
  text: string;
  is_pinned: boolean;
  client_id: string | null;
  created_at: string;
}

export type OpType = "expense" | "income" | "transfer";
export type SplitType = "equal" | "parts" | "amounts";

export interface Split {
  id: string;
  expense_id: string;
  tg_id: number;
  amount: number;
}

/** Позиция чека после распознавания. */
export interface ReceiptItem {
  title: string;
  qty: number;
  sum: number;
  /** Кто ел/пользовался. Пусто — делится на всех участников расхода. */
  for: number[];
}

export interface ReceiptData {
  merchant: string | null;
  date: string | null;
  currency: Currency | null;
  total: number | null;
  items: Array<{ title: string; qty: number; sum: number }>;
  confidence: "high" | "medium" | "low";
  note: string | null;
}

export interface Expense {
  id: string;
  trip_id: string;
  op_type: OpType;
  paid_by: number;
  transfer_to: number | null;
  amount: number;
  currency: Currency;
  description: string;
  category: string;
  split_type: SplitType;
  expense_date: string;
  photo_url: string | null;
  items: ReceiptItem[] | null;
  client_id: string | null;
  created_by: number | null;
  created_at: string;
  splits: Split[];
}

export interface Settlement {
  id: string;
  trip_id: string;
  from_tg_id: number;
  to_tg_id: number;
  amount: number;
  currency: Currency;
  client_id: string | null;
  created_at: string;
}

export interface GearItem {
  id: string;
  trip_id: string;
  title: string;
  qty: string | null;
  assignee: number | null;
  done: boolean;
  sort_order: number;
}

/** Курс валюты к базовой валюте поездки: 1 единица = rate базовых. */
export type Rates = Record<string, number>;

/** Всё, что нужно экрану поездки, одним запросом. */
export interface TripBundle {
  trip: Trip;
  me: { tg_id: number; role: "admin" | "member" };
  members: Member[];
  places: Place[];
  schedule: ScheduleEvent[];
  expenses: Expense[];
  settlements: Settlement[];
  gear: GearItem[];
  rates: Rates;
}

// ─── Схемы входных данных ─────────────────────────────────────────────────

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате YYYY-MM-DD");
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Время в формате HH:MM");
const tgId = z.number().int().positive();

export const TripInput = z.object({
  name: z.string().trim().min(1, "Название обязательно").max(80),
  start_date: isoDate,
  end_date: isoDate,
  description: z.string().trim().max(500).optional().nullable(),
  base_currency: z.enum(CURRENCIES).default("RUB"),
}).refine((t) => t.end_date >= t.start_date, { message: "Дата окончания раньше начала", path: ["end_date"] });

export const SplitInput = z.object({ tg_id: tgId, amount: z.number().min(0) });

export const ExpenseInput = z.object({
  op_type: z.enum(["expense", "income", "transfer"]).default("expense"),
  paid_by: tgId,
  transfer_to: tgId.optional().nullable(),
  amount: z.number().positive("Сумма должна быть больше нуля"),
  currency: z.enum(CURRENCIES).default("RUB"),
  description: z.string().trim().max(120).default(""),
  category: z.string().max(32).default("other"),
  split_type: z.enum(["equal", "parts", "amounts"]).default("equal"),
  expense_date: isoDate,
  photo_url: z.string().max(500).optional().nullable(),
  items: z.array(z.object({ title: z.string().max(200), qty: z.number().min(0), sum: z.number().min(0), for: z.array(tgId).default([]) })).max(200).optional().nullable(),
  client_id: z.string().max(64).optional().nullable(),
  splits: z.array(SplitInput).default([]),
}).refine((e) => e.op_type !== "transfer" || (e.transfer_to && e.transfer_to !== e.paid_by), {
  message: "Для перевода нужен получатель",
  path: ["transfer_to"],
});

export const SettlementInput = z.object({
  from_tg_id: tgId,
  to_tg_id: tgId,
  amount: z.number().positive(),
  currency: z.enum(CURRENCIES).default("RUB"),
  client_id: z.string().max(64).optional().nullable(),
});

export const PlaceInput = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  map_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  photo_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  category: z.string().max(32).default("other"),
  sort_order: z.number().int().default(0),
});

export const ScheduleInput = z.object({
  day: isoDate,
  time_start: time,
  time_end: time.optional().nullable(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  place_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().default(0),
});

export const MessageInput = z.object({
  text: z.string().trim().min(1).max(1000),
  client_id: z.string().max(64).optional().nullable(),
});

export const ProfileInput = z.object({
  display_name: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  bio: z.string().trim().max(300).optional().nullable(),
  dietary: z.string().trim().max(200).optional().nullable(),
  pay_note: z.string().trim().max(120).optional().nullable(),
});

export const GearInput = z.object({
  title: z.string().trim().min(1).max(120),
  qty: z.string().trim().max(40).optional().nullable(),
  assignee: tgId.optional().nullable(),
  done: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export type TripInputT = z.infer<typeof TripInput>;
export type ExpenseInputT = z.infer<typeof ExpenseInput>;
export type SettlementInputT = z.infer<typeof SettlementInput>;
export type PlaceInputT = z.infer<typeof PlaceInput>;
export type ScheduleInputT = z.infer<typeof ScheduleInput>;
export type MessageInputT = z.infer<typeof MessageInput>;
export type ProfileInputT = z.infer<typeof ProfileInput>;
export type GearInputT = z.infer<typeof GearInput>;

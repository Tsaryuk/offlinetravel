"use client";

import type { QueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Expense, ExpenseInputT, Message, MessageInputT, Settlement, SettlementInputT, TripBundle } from "@/lib/types";

// Ключи мутаций, которые могут остаться в очереди офлайн и уйти после перезагрузки.
// Для них mutationFn регистрируется здесь — иначе TanStack не сможет их возобновить.

export const MK = {
  addExpense: ["addExpense"] as const,
  addSettlement: ["addSettlement"] as const,
  sendMessage: ["sendMessage"] as const,
};

export const tripKey = (id: string) => ["trip", id] as const;
export const messagesKey = (id: string) => ["messages", id] as const;

export function registerMutationDefaults(qc: QueryClient) {
  qc.setMutationDefaults(MK.addExpense, {
    mutationFn: async (v: { tripId: string; input: ExpenseInputT }) =>
      api<{ expense: Expense }>(`/api/trips/${v.tripId}/expenses`, { method: "POST", body: v.input }),
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: tripKey(v.tripId) }),
  });
  qc.setMutationDefaults(MK.addSettlement, {
    mutationFn: async (v: { tripId: string; input: SettlementInputT }) =>
      api<{ settlement: Settlement }>(`/api/trips/${v.tripId}/settlements`, { method: "POST", body: v.input }),
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: tripKey(v.tripId) }),
  });
  qc.setMutationDefaults(MK.sendMessage, {
    mutationFn: async (v: { tripId: string; input: MessageInputT }) =>
      api<{ message: Message }>(`/api/trips/${v.tripId}/messages`, { method: "POST", body: v.input }),
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: messagesKey(v.tripId) }),
  });
}

/** Оптимистично добавляет расход в кэш поездки (до ответа сервера / офлайн). */
export function optimisticExpense(qc: QueryClient, tripId: string, input: ExpenseInputT, tgId: number) {
  qc.setQueryData<TripBundle>(tripKey(tripId), (old) => {
    if (!old) return old;
    const temp: Expense = {
      id: `tmp_${input.client_id ?? Math.random().toString(36).slice(2)}`,
      trip_id: tripId,
      op_type: input.op_type,
      paid_by: input.paid_by,
      transfer_to: input.transfer_to ?? null,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      category: input.category,
      split_type: input.split_type,
      expense_date: input.expense_date,
      photo_url: input.photo_url ?? null,
      items: input.items ?? null,
      client_id: input.client_id ?? null,
      created_by: tgId,
      created_at: new Date().toISOString(),
      splits: input.splits.map((s, i) => ({ id: `tmp_s${i}`, expense_id: "tmp", tg_id: s.tg_id, amount: s.amount })),
    };
    return { ...old, expenses: [temp, ...old.expenses] };
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, newClientId } from "./api";
import { MK, messagesKey, optimisticExpense, tripKey } from "./mutations";
import type {
  Expense, ExpenseInputT, Message, MessageInputT, Settlement, SettlementInputT, Trip, TripBundle, User,
} from "@/lib/types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: User; trips: Array<Trip & { role: string }> }>("/api/me"),
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKey(id),
    queryFn: () => api<TripBundle>(`/api/trips/${id}`),
    enabled: Boolean(id),
  });
}

export function useMessages(id: string) {
  return useQuery({
    queryKey: messagesKey(id),
    queryFn: () => api<{ messages: Message[] }>(`/api/trips/${id}/messages`).then((r) => r.messages),
    refetchInterval: 8000,
    enabled: Boolean(id),
  });
}

export function useAddExpense(tripId: string, tgId: number) {
  const qc = useQueryClient();
  return useMutation<{ expense: Expense }, Error, { tripId: string; input: ExpenseInputT }>({
    mutationKey: MK.addExpense,
    onMutate: (v) => optimisticExpense(qc, tripId, v.input, tgId),
  });
}

export function useUpdateExpense(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; input: ExpenseInputT }) =>
      api<{ expense: Expense }>(`/api/trips/${tripId}/expenses/${v.id}`, { method: "PATCH", body: v.input }),
    onSettled: () => qc.invalidateQueries({ queryKey: tripKey(tripId) }),
  });
}

export function useDeleteExpense(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/trips/${tripId}/expenses/${id}`, { method: "DELETE" }),
    onMutate: (id) => {
      qc.setQueryData<TripBundle>(tripKey(tripId), (old) => old && { ...old, expenses: old.expenses.filter((e) => e.id !== id) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tripKey(tripId) }),
  });
}

export function useAddSettlement(tripId: string) {
  const qc = useQueryClient();
  return useMutation<{ settlement: Settlement }, Error, { tripId: string; input: SettlementInputT }>({
    mutationKey: MK.addSettlement,
    onMutate: (v) => {
      qc.setQueryData<TripBundle>(tripKey(tripId), (old) => old && {
        ...old,
        settlements: [{ id: `tmp_${v.input.client_id}`, trip_id: tripId, ...v.input, client_id: v.input.client_id ?? null, created_at: new Date().toISOString() }, ...old.settlements],
      });
    },
  });
}

export function useSendMessage(tripId: string, tgId: number) {
  const qc = useQueryClient();
  return useMutation<{ message: Message }, Error, { tripId: string; input: MessageInputT }>({
    mutationKey: MK.sendMessage,
    onMutate: (v) => {
      qc.setQueryData<Message[]>(messagesKey(tripId), (old = []) => [
        ...old,
        { id: `tmp_${v.input.client_id}`, trip_id: tripId, author_tg_id: tgId, text: v.input.text, is_pinned: false, client_id: v.input.client_id ?? null, created_at: new Date().toISOString() },
      ]);
    },
  });
}

/** Универсальная мутация для мест/событий/участников — просто инвалидирует поездку. */
export function useTripMutation<TVars>(tripId: string, fn: (v: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: tripKey(tripId) }) });
}

export { newClientId };

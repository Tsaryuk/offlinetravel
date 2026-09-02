"use client";

import { createContext, useContext, useMemo } from "react";
import { calcBalances, calcSettlements, toBase, type Transfer } from "@/lib/balances";
import type { Member, TripBundle } from "@/lib/types";

export interface TripCtx extends TripBundle {
  isAdmin: boolean;
  membersById: Map<number, Member>;
  balances: Record<number, number>;
  transfers: Transfer[];
  name: (tgId: number) => string;
  /** Перевод суммы в базовую валюту поездки по курсам из бандла. */
  inBase: (amount: number, currency: string) => number;
  hasRate: (currency: string) => boolean;
}

const Ctx = createContext<TripCtx | null>(null);

export function TripProvider({ bundle, children }: { bundle: TripBundle; children: React.ReactNode }) {
  const value = useMemo<TripCtx>(() => {
    // Бандл может прийти из офлайн-кэша прошлой версии приложения — поля, которых
    // тогда не было, подставляем пустыми, а не падаем.
    const gear = bundle.gear ?? [];
    const rates = bundle.rates ?? {};
    const membersById = new Map(bundle.members.map((m) => [m.tg_id, m]));
    const balances = calcBalances(bundle.members.map((m) => m.tg_id), bundle.expenses, bundle.settlements, bundle.trip.base_currency, rates);
    const transfers = calcSettlements(balances);
    return {
      ...bundle,
      gear,
      rates,
      isAdmin: bundle.me.role === "admin",
      membersById,
      balances,
      transfers,
      name: (id) => {
        const m = membersById.get(id);
        return m?.display_name || m?.user?.first_name || m?.user?.username || "?";
      },
      inBase: (amount, currency) => toBase(amount, currency, bundle.trip.base_currency, rates),
      hasRate: (currency) => currency === bundle.trip.base_currency || Boolean(rates[currency]),
    };
  }, [bundle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTripCtx(): TripCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTripCtx вне TripProvider");
  return v;
}

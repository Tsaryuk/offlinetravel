"use client";

import { createContext, useContext, useMemo } from "react";
import { calcBalances, calcSettlements, type Transfer } from "@/lib/balances";
import type { Member, TripBundle } from "@/lib/types";

export interface TripCtx extends TripBundle {
  isAdmin: boolean;
  membersById: Map<number, Member>;
  balances: Record<number, number>;
  transfers: Transfer[];
  name: (tgId: number) => string;
}

const Ctx = createContext<TripCtx | null>(null);

export function TripProvider({ bundle, children }: { bundle: TripBundle; children: React.ReactNode }) {
  const value = useMemo<TripCtx>(() => {
    const membersById = new Map(bundle.members.map((m) => [m.tg_id, m]));
    const balances = calcBalances(bundle.members.map((m) => m.tg_id), bundle.expenses, bundle.settlements, bundle.trip.base_currency);
    const transfers = calcSettlements(balances);
    return {
      ...bundle,
      isAdmin: bundle.me.role === "admin",
      membersById,
      balances,
      transfers,
      name: (id) => {
        const m = membersById.get(id);
        return m?.display_name || m?.user?.first_name || m?.user?.username || "?";
      },
    };
  }, [bundle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTripCtx(): TripCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTripCtx вне TripProvider");
  return v;
}

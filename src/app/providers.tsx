"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { initTelegram } from "@/lib/client/tma";
import { registerServiceWorker } from "@/lib/client/sw";
import { registerMutationDefaults } from "@/lib/client/mutations";
import { ToastHost } from "@/components/ui/Toast";

function makeQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        // Данные поездки живут в кэше сутки: в лесу без сети экраны должны открываться.
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 15,
        retry: 1,
        refetchOnWindowFocus: true,
        // Офлайн: отдаём кэш, не падаем с ошибкой сети.
        networkMode: "offlineFirst",
      },
      mutations: {
        // Мутации без сети встают в паузу и уходят при появлении соединения.
        networkMode: "online",
        retry: 3,
      },
    },
  });
  registerMutationDefaults(qc);
  return qc;
}

const persister = createAsyncStoragePersister({
  storage: {
    getItem: (k) => get(k).then((v) => (v == null ? null : (v as string))),
    setItem: (k, v) => set(k, v),
    removeItem: (k) => del(k),
  },
  key: "ot-query-cache-v2",
  throttleTime: 500,
});

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);

  useEffect(() => {
    initTelegram();
    registerServiceWorker();
  }, []);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
      onSuccess={() => {
        // После восстановления кэша — доотправляем то, что осталось в очереди с прошлого раза.
        client.resumePausedMutations().then(() => client.invalidateQueries());
      }}
    >
      {children}
      <ToastHost />
    </PersistQueryClientProvider>
  );
}

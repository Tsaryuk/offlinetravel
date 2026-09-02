"use client";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Envelope<T> = { ok: true; data: T; error: null } | { ok: false; data: null; error: string };

export async function api<T>(
  path: string,
  opts: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  if (process.env.NEXT_PUBLIC_DEMO === "1") {
    const { demoApi } = await import("./demo");
    return demoApi<T>(path, opts.method ?? "GET", opts.body);
  }
  const res = await fetch(path, {
    method: opts.method ?? "GET",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
    signal: opts.signal,
  });
  let env: Envelope<T> | null = null;
  try {
    env = (await res.json()) as Envelope<T>;
  } catch {
    /* пустое тело */
  }
  if (!res.ok || !env || !env.ok) {
    throw new HttpError(res.status, env?.error ?? `Ошибка ${res.status}`);
  }
  return env.data;
}

export function newClientId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

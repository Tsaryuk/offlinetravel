import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

// Единственный клиент к базе — серверный, с service role.
// В браузер он не попадает: файл импортируется только из route handlers.
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const e = env();
  client = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

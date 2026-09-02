import { z } from "zod";

// Серверные переменные. Проверяются при первом обращении, а не при импорте,
// чтобы сборка не падала без .env (например, на этапе `next build`).
const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  TELEGRAM_BOT_USERNAME: z.string().min(3).default("offlinetravel_bot"),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().url().default("https://offlinetravel.vercel.app"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Не заданы переменные окружения: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

import { randomUUID } from "node:crypto";
import { db } from "./db";
import { env } from "./env";

// Аватарки: ссылка из initData живёт недолго и не всегда отдаётся браузеру,
// поэтому забираем фото через Bot API и храним у себя. Скачиваем заново только
// когда Telegram отдал другой file_id — то есть человек сменил фото.

const BUCKET = "avatars";

interface PhotosResponse {
  ok: boolean;
  result?: { total_count: number; photos: Array<Array<{ file_id: string; width: number }>> };
}

interface FileResponse {
  ok: boolean;
  result?: { file_path?: string };
}

async function tg<T>(method: string, params: Record<string, string | number>): Promise<T | null> {
  try {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const res = await fetch(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/${method}?${qs}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Забирает фото профиля из Telegram в наш storage.
 * Возвращает публичный URL или null, если фото нет либо что-то не сложилось.
 * Ошибки не бросает: вход не должен падать из-за аватарки.
 */
export async function syncAvatar(tgId: number, knownFileId: string | null): Promise<{ url: string; fileId: string } | null> {
  const photos = await tg<PhotosResponse>("getUserProfilePhotos", { user_id: tgId, limit: 1 });
  const sizes = photos?.result?.photos?.[0];
  if (!sizes?.length) return null;

  // самый крупный вариант, но не гигантский — для кружка 160px достаточно
  const best = [...sizes].sort((a, b) => b.width - a.width).find((s) => s.width <= 640) ?? sizes[sizes.length - 1];
  if (!best?.file_id) return null;
  if (knownFileId && knownFileId === best.file_id) return null; // уже выгружено

  const file = await tg<FileResponse>("getFile", { file_id: best.file_id });
  const path = file?.result?.file_path;
  if (!path) return null;

  try {
    const res = await fetch(`https://api.telegram.org/file/bot${env().TELEGRAM_BOT_TOKEN}/${path}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length || buffer.length > 1_000_000) return null;

    const name = `${randomUUID()}.jpg`;
    const up = await db().storage.from(BUCKET).upload(name, buffer, { contentType: "image/jpeg", upsert: false });
    if (up.error) return null;

    const { data } = db().storage.from(BUCKET).getPublicUrl(name);
    return { url: data.publicUrl, fileId: best.file_id };
  } catch {
    return null;
  }
}

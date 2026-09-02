import { randomUUID } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./api";
import type { ImageMediaType } from "./receipt";

const BUCKET = "receipts";
const MAX_BYTES = 5 * 1024 * 1024;

const EXT: Record<ImageMediaType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Разбирает data URL с картинкой; отвергает всё, что не картинка или слишком большое. */
export function parseImageDataUrl(dataUrl: string): { buffer: Buffer; mediaType: ImageMediaType; base64: string } {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new ApiError(400, "Ожидается изображение JPEG, PNG или WebP");
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length > MAX_BYTES) throw new ApiError(413, "Фото больше 5 МБ — сожмите или переснимите");
  return { buffer, mediaType: m[1] as ImageMediaType, base64: m[2] };
}

/** Кладёт фото чека в приватный бакет. Возвращает путь <trip_id>/<uuid>.<ext>. */
export async function uploadReceipt(tripId: string, buffer: Buffer, mediaType: ImageMediaType): Promise<string> {
  const path = `${tripId}/${randomUUID()}.${EXT[mediaType]}`;
  const res = await db().storage.from(BUCKET).upload(path, buffer, { contentType: mediaType, upsert: false });
  if (res.error) throw new ApiError(500, `Не удалось сохранить фото: ${res.error.message}`);
  return path;
}

/** Подписанная ссылка на час — для просмотра из карточки расхода. */
export async function signedReceiptUrl(path: string): Promise<string> {
  const res = await db().storage.from(BUCKET).createSignedUrl(path, 3600);
  if (res.error || !res.data) throw new ApiError(404, "Фото не найдено");
  return res.data.signedUrl;
}

export function tripIdFromPath(path: string): string | null {
  const m = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(path);
  return m ? m[1] : null;
}

import { z } from "zod";
import { handler, ok, parseBody, requireMember, type Params } from "@/lib/api";
import { recognizeReceipt, receiptsEnabled } from "@/lib/receipt";
import { parseImageDataUrl, uploadReceipt } from "@/lib/storage";

const Body = z.object({
  image: z.string().min(100).max(7_500_000), // data URL, ~5 МБ в base64
  recognize: z.boolean().default(true),
});

// Загружает фото чека и (если настроен ключ) распознаёт его.
// Фото сохраняется в любом случае — даже если распознавание упало.
export const POST = handler(async (req, { params }: Params<{ id: string }>) => {
  const { id } = await params;
  await requireMember(id);
  const { image, recognize } = await parseBody(req, Body);
  const { buffer, mediaType, base64 } = parseImageDataUrl(image);

  const photo_url = await uploadReceipt(id, buffer, mediaType);
  if (!recognize || !receiptsEnabled()) return ok({ photo_url, receipt: null });

  try {
    const receipt = await recognizeReceipt(base64, mediaType);
    return ok({ photo_url, receipt });
  } catch (e) {
    // Фото уже лежит в хранилище — отдаём его и текст ошибки, форму можно заполнить руками.
    return ok({ photo_url, receipt: null, error: (e as Error).message });
  }
});

export const GET = handler(async () => ok({ enabled: receiptsEnabled() }));

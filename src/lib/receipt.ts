import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import { ApiError } from "./api";
import { CURRENCIES, type ReceiptData } from "./types";

// Распознавание чека по фото через Claude vision.
// Ответ забираем не текстом, а вызовом инструмента с жёсткой схемой —
// так модель не может вернуть «почти JSON».

const TOOL_NAME = "receipt";

const receiptTool: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Структурированные данные чека, прочитанные с фотографии.",
  input_schema: {
    type: "object",
    properties: {
      merchant: { type: ["string", "null"], description: "Название магазина или заведения, коротко" },
      date: { type: ["string", "null"], description: "Дата покупки в формате YYYY-MM-DD, если видна" },
      currency: { type: ["string", "null"], enum: [...CURRENCIES, null], description: "Валюта чека" },
      total: { type: ["number", "null"], description: "Итоговая сумма к оплате. null, если не читается" },
      items: {
        type: "array",
        description: "Позиции чека. Скидки учитывать в sum позиции, отдельные строки скидок не включать",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Название позиции как в чеке, без артикулов" },
            qty: { type: "number", description: "Количество, по умолчанию 1" },
            sum: { type: "number", description: "Сумма по позиции с учётом количества" },
          },
          required: ["title", "qty", "sum"],
        },
      },
      confidence: { type: "string", enum: ["high", "medium", "low"], description: "Насколько уверенно прочитан итог" },
      note: { type: ["string", "null"], description: "Что не удалось прочитать или вызывает сомнение, одной фразой по-русски" },
    },
    required: ["merchant", "date", "currency", "total", "items", "confidence", "note"],
  },
};

const SYSTEM = `Ты читаешь фотографии кассовых чеков и счетов из кафе для приложения учёта общих расходов в поездке.
Верни данные строго через инструмент ${TOOL_NAME}. Правила:
- Итог (total) — сумма к оплате после всех скидок. Если чек обрезан или итог не читается, ставь null и confidence "low".
- Позиции: каждая строка товара отдельно; qty — количество, sum — сумма по строке. Сумма позиций должна сходиться с итогом; если не сходится, укажи это в note.
- Не выдумывай позиции и цены. Нечитаемое лучше пропустить, чем угадать.
- Валюта по символам и языку чека: ₽ или русский текст — RUB; ฿ — THB; ₺ — TRY; ₾ — GEL; $ — USD; € — EUR. Иначе null.
- Дата только если явно напечатана.`;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export function receiptsEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function recognizeReceipt(base64: string, mediaType: ImageMediaType): Promise<ReceiptData> {
  const key = env().ANTHROPIC_API_KEY;
  if (!key) throw new ApiError(503, "Распознавание чеков не настроено: нет ANTHROPIC_API_KEY");

  const client = new Anthropic({ apiKey: key });
  let res: Anthropic.Message;
  try {
    res = await client.messages.create({
      model: env().ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      tools: [receiptTool],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Прочитай этот чек." },
          ],
        },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiError(502, `Сервис распознавания не ответил: ${msg}`);
  }

  const call = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === "tool_use" && c.name === TOOL_NAME);
  if (!call) throw new ApiError(502, "Модель не вернула данные чека");
  return normalize(call.input as Record<string, unknown>);
}

function normalize(raw: Record<string, unknown>): ReceiptData {
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null);
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const cur = str(raw.currency);
  const items = Array.isArray(raw.items)
    ? raw.items
        .map((it) => {
          const o = (it ?? {}) as Record<string, unknown>;
          return { title: str(o.title) ?? "Позиция", qty: num(o.qty) || 1, sum: num(o.sum) ?? 0 };
        })
        .filter((it) => it.sum > 0)
    : [];
  const conf = raw.confidence === "high" || raw.confidence === "medium" ? raw.confidence : "low";
  const date = str(raw.date);
  return {
    merchant: str(raw.merchant),
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    currency: cur && (CURRENCIES as readonly string[]).includes(cur) ? (cur as ReceiptData["currency"]) : null,
    total: num(raw.total),
    items,
    confidence: conf,
    note: str(raw.note),
  };
}

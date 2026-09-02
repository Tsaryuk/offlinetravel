import { handler, ok, parseBody, requireMember, ApiError, type Params } from "@/lib/api";
import { insertRow } from "@/lib/repo";
import { SettlementInput, type Settlement } from "@/lib/types";

// Отметка «долг возвращён». Подтверждать может только получатель денег или организатор.
export const POST = handler(async (req, { params }: Params<{ id: string }>) => {
  const { id } = await params;
  const m = await requireMember(id);
  const input = await parseBody(req, SettlementInput);
  if (m.role !== "admin" && input.to_tg_id !== m.tgId) {
    throw new ApiError(403, "Подтвердить возврат может тот, кто получил деньги");
  }
  const settlement = await insertRow<Settlement>("settlements", id, { ...input, created_by: m.tgId });
  return ok({ settlement }, { status: 201 });
});

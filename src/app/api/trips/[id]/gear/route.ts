import { handler, ok, parseBody, requireMember, type Params } from "@/lib/api";
import { insertRow } from "@/lib/repo";
import { GearInput, type GearItem } from "@/lib/types";

// Снаряжение добавляет любой участник — это общий список, а не расписание.
export const POST = handler(async (req, { params }: Params<{ id: string }>) => {
  const { id } = await params;
  const m = await requireMember(id);
  const input = await parseBody(req, GearInput);
  const item = await insertRow<GearItem>("gear_items", id, { ...input, created_by: m.tgId });
  return ok({ item }, { status: 201 });
});

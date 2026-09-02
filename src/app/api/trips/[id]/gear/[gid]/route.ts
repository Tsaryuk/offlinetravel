import { handler, ok, parseBody, requireMember, type Params } from "@/lib/api";
import { deleteRow, updateRow } from "@/lib/repo";
import { GearInput, type GearItem } from "@/lib/types";

type P = Params<{ id: string; gid: string }>;

export const PATCH = handler(async (req, { params }: P) => {
  const { id, gid } = await params;
  await requireMember(id);
  const input = await parseBody(req, GearInput.partial());
  const item = await updateRow<GearItem>("gear_items", id, gid, input);
  return ok({ item });
});

export const DELETE = handler(async (_req, { params }: P) => {
  const { id, gid } = await params;
  await requireMember(id);
  await deleteRow("gear_items", id, gid);
  return ok({ deleted: gid });
});

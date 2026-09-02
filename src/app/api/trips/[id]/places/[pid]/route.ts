import { handler, ok, parseBody, requireAdmin, requireMember, type Params } from "@/lib/api";
import { deleteRow, updateRow } from "@/lib/repo";
import { PlaceInput, type Place } from "@/lib/types";

type P = Params<{ id: string; pid: string }>;

export const PATCH = handler(async (req, { params }: P) => {
  const { id, pid } = await params;
  requireAdmin(await requireMember(id));
  const input = await parseBody(req, PlaceInput.partial());
  const place = await updateRow<Place>("places", id, pid, { ...input, map_url: input.map_url || null, photo_url: input.photo_url || null });
  return ok({ place });
});

export const DELETE = handler(async (_req, { params }: P) => {
  const { id, pid } = await params;
  requireAdmin(await requireMember(id));
  await deleteRow("places", id, pid);
  return ok({ deleted: pid });
});

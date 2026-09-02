import { handler, ok, parseBody, requireAdmin, requireMember, type Params } from "@/lib/api";
import { insertRow } from "@/lib/repo";
import { PlaceInput, type Place } from "@/lib/types";

export const POST = handler(async (req, { params }: Params<{ id: string }>) => {
  const { id } = await params;
  const m = await requireMember(id);
  requireAdmin(m);
  const input = await parseBody(req, PlaceInput);
  const place = await insertRow<Place>("places", id, { ...input, map_url: input.map_url || null, photo_url: input.photo_url || null, created_by: m.tgId });
  return ok({ place }, { status: 201 });
});

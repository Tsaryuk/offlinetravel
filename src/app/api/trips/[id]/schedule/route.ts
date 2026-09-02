import { handler, ok, parseBody, requireAdmin, requireMember, type Params } from "@/lib/api";
import { insertRow } from "@/lib/repo";
import { ScheduleInput, type ScheduleEvent } from "@/lib/types";

export const POST = handler(async (req, { params }: Params<{ id: string }>) => {
  const { id } = await params;
  const m = await requireMember(id);
  requireAdmin(m);
  const input = await parseBody(req, ScheduleInput);
  const event = await insertRow<ScheduleEvent>("schedule", id, { ...input, created_by: m.tgId });
  return ok({ event }, { status: 201 });
});

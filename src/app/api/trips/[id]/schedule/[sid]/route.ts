import { handler, ok, parseBody, requireAdmin, requireMember, type Params } from "@/lib/api";
import { deleteRow, updateRow } from "@/lib/repo";
import { ScheduleInput, type ScheduleEvent } from "@/lib/types";

type P = Params<{ id: string; sid: string }>;

export const PATCH = handler(async (req, { params }: P) => {
  const { id, sid } = await params;
  requireAdmin(await requireMember(id));
  const input = await parseBody(req, ScheduleInput.partial());
  const event = await updateRow<ScheduleEvent>("schedule", id, sid, input);
  return ok({ event });
});

export const DELETE = handler(async (_req, { params }: P) => {
  const { id, sid } = await params;
  requireAdmin(await requireMember(id));
  await deleteRow("schedule", id, sid);
  return ok({ deleted: sid });
});

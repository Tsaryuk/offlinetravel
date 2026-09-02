import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { createTrip } from "@/lib/repo";
import { TripInput } from "@/lib/types";

export const POST = handler(async (req) => {
  const tgId = await requireUser();
  const input = await parseBody(req, TripInput);
  const trip = await createTrip(tgId, { ...input, description: input.description ?? null });
  return ok({ trip }, { status: 201 });
});

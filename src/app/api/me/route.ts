import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { getUser, listTripsFor, updateUser } from "@/lib/repo";
import { ProfileInput } from "@/lib/types";

export const GET = handler(async () => {
  const tgId = await requireUser();
  const [user, trips] = await Promise.all([getUser(tgId), listTripsFor(tgId)]);
  return ok({ user, trips });
});

export const PATCH = handler(async (req) => {
  const tgId = await requireUser();
  const { display_name: _dn, ...patch } = await parseBody(req, ProfileInput);
  const user = await updateUser(tgId, patch);
  return ok({ user });
});

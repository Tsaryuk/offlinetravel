import { handler, ok } from "@/lib/api";
import { clearSessionCookie } from "@/lib/session";

export const POST = handler(async () => {
  await clearSessionCookie();
  return ok({ loggedOut: true });
});

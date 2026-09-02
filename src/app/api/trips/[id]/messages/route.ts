import { handler, ok, parseBody, requireMember, ApiError, type Params } from "@/lib/api";
import { db } from "@/lib/db";
import { insertRow } from "@/lib/repo";
import { MessageInput, type Message } from "@/lib/types";

type P = Params<{ id: string }>;

// GET ?since=<ISO> — только новые сообщения (для опроса чата раз в несколько секунд)
export const GET = handler(async (req, { params }: P) => {
  const { id } = await params;
  await requireMember(id);
  const since = new URL(req.url).searchParams.get("since");
  let q = db().from("messages").select("*").eq("trip_id", id).order("created_at").limit(300);
  if (since) q = q.gt("created_at", since);
  const res = await q;
  if (res.error) throw new ApiError(500, res.error.message);
  return ok({ messages: res.data as Message[] });
});

export const POST = handler(async (req, { params }: P) => {
  const { id } = await params;
  const m = await requireMember(id);
  const input = await parseBody(req, MessageInput);
  const message = await insertRow<Message>("messages", id, { ...input, author_tg_id: m.tgId });
  return ok({ message }, { status: 201 });
});

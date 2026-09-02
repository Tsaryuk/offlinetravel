import { handler, ok, requireAdmin, requireMember, type Params } from "@/lib/api";
import { sendDebtReminders } from "@/lib/reminders";

// Организатор вручную рассылает напоминания о долгах в Telegram.
export const POST = handler(async (_req, { params }: Params<{ id: string }>) => {
  const { id } = await params;
  const m = await requireMember(id);
  requireAdmin(m);
  const sent = await sendDebtReminders(id, m.tgId);
  return ok({ sent });
});

import { handler, ok, parseBody, requireMember, ApiError, type Params } from "@/lib/api";
import { deleteRow, getExpenseOwner, updateExpense } from "@/lib/repo";
import { ExpenseInput } from "@/lib/types";

type P = Params<{ id: string; eid: string }>;

async function assertCanEdit(tripId: string, eid: string, tgId: number, role: string) {
  const owner = await getExpenseOwner(tripId, eid);
  if (role !== "admin" && owner !== tgId) throw new ApiError(403, "Менять расход может только автор или организатор");
}

export const PATCH = handler(async (req, { params }: P) => {
  const { id, eid } = await params;
  const m = await requireMember(id);
  await assertCanEdit(id, eid, m.tgId, m.role);
  const { splits, ...input } = await parseBody(req, ExpenseInput);
  const expense = await updateExpense(id, eid, input, input.op_type === "transfer" ? [] : splits);
  return ok({ expense });
});

export const DELETE = handler(async (_req, { params }: P) => {
  const { id, eid } = await params;
  const m = await requireMember(id);
  await assertCanEdit(id, eid, m.tgId, m.role);
  await deleteRow("expenses", id, eid);
  return ok({ deleted: eid });
});

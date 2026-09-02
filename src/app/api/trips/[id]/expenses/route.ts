import { handler, ok, parseBody, requireMember, type Params } from "@/lib/api";
import { insertExpense } from "@/lib/repo";
import { ExpenseInput } from "@/lib/types";

export const POST = handler(async (req, { params }: Params<{ id: string }>) => {
  const { id } = await params;
  const m = await requireMember(id);
  const { splits, ...input } = await parseBody(req, ExpenseInput);
  const expense = await insertExpense(id, m.tgId, input, input.op_type === "transfer" ? [] : splits);
  return ok({ expense }, { status: 201 });
});

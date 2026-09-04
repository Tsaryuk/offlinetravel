import { redirect } from "next/navigation";

// Вкладки живут в одной ленте на /t/[id]; старый адрес просто ведёт туда.
export default async function Redirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/t/${id}`);
}

import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { Login } from "@/components/Login";

export const dynamic = "force-dynamic";

export default async function IndexPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (process.env.NEXT_PUBLIC_DEMO === "1") redirect("/trips");
  const session = await readSession();
  if (session) redirect(next && next.startsWith("/") ? next : "/trips");
  return <Login next={next} />;
}

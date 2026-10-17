import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { FunnelView, DEFAULT_STEPS } from "@/components/funnel-view";
import { parseDays } from "@/lib/range";

export default async function FunnelPage({
  params, searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ steps?: string; days?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { siteId } = await params;
  const sp = await searchParams;
  const days = parseDays(sp.days);

  if (!/^[0-9a-f-]{36}$/i.test(siteId)) notFound();
  const [site] = await db
    .select().from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);
  if (!site) notFound();

  return <FunnelView site={site} stepsText={sp.steps ?? DEFAULT_STEPS} days={days} />;
}

import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { SiteStatsView } from "@/components/site-stats-view";
import { parseDays } from "@/lib/range";

export default async function SitePage({
  params, searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { siteId } = await params;
  const { days: daysParam } = await searchParams;
  const days = parseDays(daysParam);

  if (!/^[0-9a-f-]{36}$/i.test(siteId)) notFound();
  const [site] = await db
    .select().from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);
  if (!site) notFound();

  return <SiteStatsView site={site} days={days} backHref="/dashboard" backLabel="All sites" />;
}

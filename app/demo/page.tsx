import { notFound } from "next/navigation";
import { getDemoSite } from "@/lib/demo";
import { parseDays } from "@/lib/range";
import { SiteStatsView } from "@/components/site-stats-view";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const site = await getDemoSite();
  if (!site) notFound();
  const { days } = await searchParams;

  return <SiteStatsView site={site} days={parseDays(days)} backHref="/" backLabel="Home" />;
}

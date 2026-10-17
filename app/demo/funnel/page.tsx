import { notFound } from "next/navigation";
import { getDemoSite } from "@/lib/demo";
import { parseDays } from "@/lib/range";
import { FunnelView, DEFAULT_STEPS } from "@/components/funnel-view";

export default async function DemoFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ steps?: string; days?: string }>;
}) {
  const site = await getDemoSite();
  if (!site) notFound();
  const sp = await searchParams;

  return <FunnelView site={site} stepsText={sp.steps ?? DEFAULT_STEPS} days={parseDays(sp.days)} />;
}

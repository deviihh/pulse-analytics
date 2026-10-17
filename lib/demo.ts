import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";

// The public demo page shows exactly one site, chosen by the DEMO_SITE_ID
// environment variable. No other site is ever readable without signing in.
// Only id, name and domain are returned, never the owner or the site key.
export async function getDemoSite() {
  const id = process.env.DEMO_SITE_ID;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [site] = await db
    .select({ id: sites.id, name: sites.name, domain: sites.domain })
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);
  return site ?? null;
}

import { config } from "dotenv";
import { createHash } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { sites, events } from "../db/schema";

config({ path: ".env.local" });

const db = drizzle(neon(process.env.DATABASE_URL!));

const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]) => arr[rnd(arr.length)];
function weighted<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of items) {
    if ((r -= w) <= 0) return v;
  }
  return items[0][0];
}

const PATHS: [string, number][] = [
  ["/", 30], ["/pricing", 14], ["/blog", 10], ["/blog/getting-started", 8],
  ["/blog/privacy-first-analytics", 6], ["/docs", 9], ["/docs/install", 6],
  ["/signup", 5], ["/login", 4], ["/about", 3], ["/contact", 2],
];
const REFERRERS: [string | null, number][] = [
  [null, 45], ["google.com", 22], ["twitter.com", 8], ["github.com", 7],
  ["news.ycombinator.com", 5], ["linkedin.com", 7], ["reddit.com", 4], ["duckduckgo.com", 2],
];
const COUNTRIES: [string, number][] = [
  ["US", 30], ["IN", 20], ["GB", 9], ["DE", 8], ["CA", 6], ["FR", 5],
  ["BR", 5], ["AU", 4], ["NL", 3], ["JP", 3], ["SG", 2], ["ES", 2], ["SE", 1],
];
const CAMPAIGNS = ["launch", "spring-sale", "newsletter"];

function makeVisitor() {
  const device = weighted<string>([["desktop", 60], ["mobile", 35], ["tablet", 5]]);
  const os =
    device === "desktop" ? weighted<string>([["Windows", 50], ["macOS", 35], ["Linux", 15]]) :
    device === "mobile" ? weighted<string>([["Android", 60], ["iOS", 40]]) : "iOS";
  const browser =
    os === "iOS" ? weighted<string>([["Safari", 85], ["Chrome", 15]]) :
    os === "macOS" ? weighted<string>([["Safari", 40], ["Chrome", 50], ["Firefox", 10]]) :
    weighted<string>([["Chrome", 65], ["Edge", 15], ["Firefox", 15], ["Opera", 5]]);
  const country = weighted(COUNTRIES);
  const referrer = weighted(REFERRERS);
  const social = referrer === "twitter.com" || referrer === "linkedin.com";
  const utm = social && Math.random() < 0.5;
  return {
    device, os, browser, country, referrer,
    utmSource: utm ? referrer!.split(".")[0] : null,
    utmMedium: utm ? "social" : null,
    utmCampaign: utm ? pick(CAMPAIGNS) : null,
  };
}

async function main() {
  const total = Number(process.argv[2] ?? 5000);
  const keyArg = process.argv[3];
  const [site] = keyArg
    ? await db.select().from(sites).where(eq(sites.siteKey, keyArg)).limit(1)
    : await db.select().from(sites).limit(1);
  if (!site) throw new Error("No site found. Add one in the dashboard first.");
  console.log(`Seeding ${total} events for ${site.name} (${site.domain})`);

  const visitorPool = Array.from({ length: Math.ceil(total / 3) }, makeVisitor);
  const rows: (typeof events.$inferInsert)[] = [];
  const now = Date.now();

  while (rows.length < total) {
    // skew toward recent days so the chart shows growth
    const dayOffset = Math.floor(30 * (1 - Math.sqrt(Math.random())));
    const hour = weighted<number>(
      Array.from({ length: 24 }, (_, h): [number, number] => [h, h >= 8 && h <= 22 ? 5 : 1])
    );
    const start = new Date(now - dayOffset * 86_400_000);
    start.setUTCHours(hour, rnd(60), rnd(60), 0);
    if (start.getTime() > now) continue;

    const vIndex = Math.floor(Math.pow(Math.random(), 1.5) * visitorPool.length);
    const v = visitorPool[vIndex];
    const day = start.toISOString().slice(0, 10);
    const hash = "seed_" + createHash("sha1").update(`${vIndex}|${day}`).digest("hex").slice(0, 27);

    const pages = 1 + rnd(4);
    let t = start.getTime();
    for (let i = 0; i < pages && rows.length < total; i++) {
      rows.push({
        siteId: site.id,
        type: "pageview",
        path: weighted(PATHS),
        // only the first page of a session has an external referrer
        referrer: i === 0 ? v.referrer : null,
        utmSource: i === 0 ? v.utmSource : null,
        utmMedium: i === 0 ? v.utmMedium : null,
        utmCampaign: i === 0 ? v.utmCampaign : null,
        browser: v.browser, os: v.os, device: v.device, country: v.country,
        visitorHash: hash,
        createdAt: new Date(t),
      });
      t += (20 + rnd(180)) * 1000;
    }
  }

  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(events).values(rows.slice(i, i + BATCH));
    console.log(`  inserted ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
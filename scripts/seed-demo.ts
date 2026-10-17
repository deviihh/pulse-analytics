import { config } from "dotenv";
import { randomBytes } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql, eq } from "drizzle-orm";
import { sites } from "../db/schema";

config({ path: ".env.local" });

const db = drizzle(neon(process.env.DATABASE_URL!));

const DEMO_NAME = "Demo (sample data)";
const SESSIONS = 11_000; // about 20,000 page views

async function main() {
  // the demo belongs to the same account as your first real site
  const [owner] = await db
    .select()
    .from(sites)
    .where(sql`name <> ${DEMO_NAME}`)
    .limit(1);
  if (!owner) throw new Error("Add one real site in the dashboard first.");

  // remove an older demo site (its events are deleted with it)
  await db.delete(sites).where(eq(sites.name, DEMO_NAME));

  const [demo] = await db
    .insert(sites)
    .values({
      userId: owner.userId,
      name: DEMO_NAME,
      domain: "demo.example.com",
      siteKey: "pk_" + randomBytes(12).toString("hex"),
    })
    .returning();

  console.log(`Created ${demo.name}, seeding ~${Math.round(SESSIONS * 1.8)} events`);

  await db.execute(sql`
    insert into events
      (site_id, type, path, referrer, browser, os, device, country, visitor_hash, created_at)
    select
      ${demo.id}::uuid,
      'pageview',
      s.arr[e.i],
      case when e.i = 1 then s.ref else null end,
      s.browser,
      s.os,
      case when s.os in ('Android', 'iOS') then 'mobile' else 'desktop' end,
      s.country,
      'demo_' || md5(s.sid::text || to_char(s.ts, 'YYYY-MM-DD')),
      s.ts + ((e.i - 1) * (20 + floor(s.rj * 100))) * interval '1 second'
    from (
      select
        b.sid, b.ts, b.rj,
        case
          when b.f < 0.30 then array['/', '/pricing', '/signup', '/login']
          when b.f < 0.50 then array['/', '/blog', '/blog/getting-started', '/docs']
          when b.f < 0.65 then array['/docs', '/docs/install', '/pricing', '/signup']
          when b.f < 0.75 then array['/pricing', '/signup', '/login', '/about']
          else array['/', '/about', '/blog', '/pricing']
        end as arr,
        case when b.d < 0.08 then 4 when b.d < 0.20 then 3 when b.d < 0.50 then 2 else 1 end as len,
        (array[NULL::text, NULL, NULL, NULL, 'google.com', 'google.com', 'twitter.com', 'github.com', 'linkedin.com', 'reddit.com', 'news.ycombinator.com'])[1 + floor(b.rr * 11)::int] as ref,
        (array['Chrome', 'Chrome', 'Chrome', 'Safari', 'Safari', 'Firefox', 'Edge'])[1 + floor(b.rb * 7)::int] as browser,
        (array['Windows', 'Windows', 'macOS', 'Android', 'iOS', 'Linux'])[1 + floor(b.ro * 6)::int] as os,
        (array['US', 'US', 'US', 'IN', 'IN', 'GB', 'DE', 'CA', 'FR', 'BR', 'AU', 'JP'])[1 + floor(b.rc * 12)::int] as country
      from (
        select
          g as sid,
          now() - interval '10 minutes' - (30 * (1 - sqrt(random()))) * interval '1 day' as ts,
          random() as f, random() as d, random() as rr,
          random() as rb, random() as ro, random() as rc, random() as rj
        from generate_series(1, ${SESSIONS}) g
      ) b
    ) s
    cross join lateral generate_series(1, s.len) as e(i)
  `);

  console.log("Done.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
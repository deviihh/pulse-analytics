import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { sites } from "../db/schema";

config({ path: ".env.local" });

const db = drizzle(neon(process.env.DATABASE_URL!));

// ~1.8 page views per session, so 560k sessions is about 1M events.
const SESSIONS = Number(process.argv[2] ?? 560_000);
const CHUNK = 50_000;

async function main() {
  const [site] = await db.select().from(sites).limit(1);
  if (!site) throw new Error("No site found. Add one in the dashboard first.");
  console.log(`Seeding ~${Math.round(SESSIONS * 1.8)} events for ${site.name}`);

  // truncate (not delete) so the table doesn't bloat and storage stays small
  await db.execute(sql`truncate events, daily_stats, daily_dim_stats`);
  console.log("Cleared events and rollup tables");

  const t0 = Date.now();
  for (let done = 0; done < SESSIONS; done += CHUNK) {
    const n = Math.min(CHUNK, SESSIONS - done);
    await db.execute(sql`
      insert into events
        (site_id, type, path, referrer, browser, os, device, country, visitor_hash, created_at)
      select
        ${site.id}::uuid,
        'pageview',
        s.arr[e.i],
        case when e.i = 1 then s.ref else null end,
        s.browser,
        s.os,
        case when s.os in ('Android', 'iOS') then 'mobile' else 'desktop' end,
        s.country,
        'seed_' || md5(s.sid::text || to_char(s.ts, 'YYYY-MM-DD')),
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
            g + ${done}::int as sid,
            now() - interval '10 minutes' - (30 * (1 - sqrt(random()))) * interval '1 day' as ts,
            random() as f, random() as d, random() as rr,
            random() as rb, random() as ro, random() as rc, random() as rj
          from generate_series(1, ${n}) g
        ) b
      ) s
      cross join lateral generate_series(1, s.len) as e(i)
    `);
    console.log(`  sessions ${Math.min(done + CHUNK, SESSIONS)} / ${SESSIONS}`);
  }

  await db.execute(sql`analyze events`);
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
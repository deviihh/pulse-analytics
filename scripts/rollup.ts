import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });
const db = drizzle(neon(process.env.DATABASE_URL!));

const DIMS: [string, string][] = [
  ["page", "path"],
  ["source", "coalesce(referrer, 'Direct')"],
  ["country", "coalesce(country, 'Unknown')"],
  ["device", "coalesce(device, 'Unknown')"],
  ["browser", "coalesce(browser, 'Unknown')"],
];

async function main() {
  const t0 = Date.now();

  await db.execute(sql`
    insert into daily_stats (site_id, day, pageviews, visitors)
    select site_id,
           (created_at at time zone 'UTC')::date,
           count(*)::int,
           count(distinct visitor_hash)::int
    from events
    where type = 'pageview'
    group by 1, 2
    on conflict (site_id, day)
    do update set pageviews = excluded.pageviews, visitors = excluded.visitors
  `);
  console.log(`daily_stats done (${Date.now() - t0} ms)`);

  for (const [dim, expr] of DIMS) {
    const t = Date.now();
    await db.execute(sql`
      insert into daily_dim_stats (site_id, day, dim, label, pageviews, visitors)
      select site_id,
             (created_at at time zone 'UTC')::date,
             ${dim}::text,
             ${sql.raw(expr)},
             count(*)::int,
             count(distinct visitor_hash)::int
      from events
      where type = 'pageview'
      group by 1, 2, 4
      on conflict (site_id, day, dim, label)
      do update set pageviews = excluded.pageviews, visitors = excluded.visitors
    `);
    console.log(`  ${dim} done (${Date.now() - t} ms)`);
  }

  console.log(`Rollup finished in ${Date.now() - t0} ms`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
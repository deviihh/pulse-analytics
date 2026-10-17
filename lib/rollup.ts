import { sql } from "drizzle-orm";
import { db } from "@/db";

const DIMS: [string, string][] = [
  ["page", "path"],
  ["source", "coalesce(referrer, 'Direct')"],
  ["country", "coalesce(country, 'Unknown')"],
  ["device", "coalesce(device, 'Unknown')"],
  ["browser", "coalesce(browser, 'Unknown')"],
];

// Recomputes the last `days` UTC days (default: today + yesterday).
// Re-running is safe: rows are upserted.
export async function runRollup(days = 2) {
  const t0 = Date.now();
  const since = sql`(date_trunc('day', now() at time zone 'UTC') - ${days - 1} * interval '1 day')`;

  await db.execute(sql`
    insert into daily_stats (site_id, day, pageviews, visitors)
    select site_id,
           (created_at at time zone 'UTC')::date,
           count(*)::int,
           count(distinct visitor_hash)::int
    from events
    where type = 'pageview'
      and (created_at at time zone 'UTC') >= ${since}
    group by 1, 2
    on conflict (site_id, day)
    do update set pageviews = excluded.pageviews, visitors = excluded.visitors
  `);

  for (const [dim, expr] of DIMS) {
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
        and (created_at at time zone 'UTC') >= ${since}
      group by 1, 2, 4
      on conflict (site_id, day, dim, label)
      do update set pageviews = excluded.pageviews, visitors = excluded.visitors
    `);
  }

  return { days, ms: Date.now() - t0 };
}
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

type Row = Record<string, unknown>;

async function run<T extends Row>(q: SQL): Promise<T[]> {
  const res: any = await db.execute(q);
  return (Array.isArray(res) ? res : res.rows) as T[];
}

export async function getStats(siteId: string, days: number, useRollup = true) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const fromDay = fromIso.slice(0, 10);
  const toDay = toIso.slice(0, 10);

  const w = sql`site_id = ${siteId}::uuid
    and type = 'pageview'
    and created_at >= ${fromIso}::timestamptz
    and created_at < ${toIso}::timestamptz`;

  const days_ = sql`generate_series(
      date_trunc('day', ${fromIso}::timestamptz at time zone 'UTC'),
      date_trunc('day', ${toIso}::timestamptz at time zone 'UTC'),
      interval '1 day') d`;

  const seriesQ = useRollup
    ? sql`
      select d::date as day,
             coalesce(r.pageviews, 0)::int as pageviews,
             coalesce(r.visitors, 0)::int as visitors
      from ${days_}
      left join daily_stats r on r.site_id = ${siteId}::uuid and r.day = d::date
      order by d`
    : sql`
      select d::date as day,
             coalesce(p.pageviews, 0)::int as pageviews,
             coalesce(p.visitors, 0)::int as visitors
      from ${days_}
      left join (
        select date_trunc('day', created_at at time zone 'UTC') as day,
               count(*) as pageviews,
               count(distinct visitor_hash) as visitors
        from events where ${w}
        group by 1
      ) p on p.day = d
      order by d`;

  const series = await run<{ day: string; pageviews: number; visitors: number }>(seriesQ);

  // Rollup path: visitors are summed over days (a returning visitor counts once per day,
  // because the visitor hash rotates daily by design).
  const totals = useRollup
    ? {
        pageviews: series.reduce((s, r) => s + r.pageviews, 0),
        visitors: series.reduce((s, r) => s + r.visitors, 0),
      }
    : (await run<{ pageviews: number; visitors: number }>(sql`
        select count(*)::int as pageviews,
               count(distinct visitor_hash)::int as visitors
        from events where ${w}`))[0] ?? { pageviews: 0, visitors: 0 };

  const dimQ = (dim: string, expr: string, orderBy: "pageviews" | "visitors", limit: number) =>
    useRollup
      ? run<{ label: string; pageviews: number; visitors: number }>(sql`
          select label,
                 sum(pageviews)::int as pageviews,
                 sum(visitors)::int as visitors
          from daily_dim_stats
          where site_id = ${siteId}::uuid and dim = ${dim}
            and day >= ${fromDay}::date and day <= ${toDay}::date
          group by label
          order by ${sql.raw(orderBy)} desc
          limit ${limit}`)
      : run<{ label: string; pageviews: number; visitors: number }>(sql`
          select ${sql.raw(expr)} as label,
                 count(*)::int as pageviews,
                 count(distinct visitor_hash)::int as visitors
          from events where ${w}
          group by 1
          order by ${sql.raw(orderBy)} desc
          limit ${limit}`);

  const [pages, sources, countries, devices, browsers] = await Promise.all([
    dimQ("page", "path", "pageviews", 10),
    dimQ("source", "coalesce(referrer, 'Direct')", "visitors", 10),
    dimQ("country", "coalesce(country, 'Unknown')", "visitors", 10),
    dimQ("device", "coalesce(device, 'Unknown')", "visitors", 10),
    dimQ("browser", "coalesce(browser, 'Unknown')", "visitors", 6),
  ]);

  return { totals, series, pages, sources, countries, devices, browsers };
}
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

// "/pricing" matches a page view; "event:signup_click" matches a custom event.
function match(step: string): SQL {
  if (step.startsWith("event:")) {
    return sql`type = 'custom' and name = ${step.slice(6)}`;
  }
  return sql`type = 'pageview' and path = ${step}`;
}

export async function getFunnel(siteId: string, steps: string[], days: number) {
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  const base = sql`site_id = ${siteId}::uuid and created_at >= ${from}::timestamptz`;

  // s1 = visitors who did step 1 (first time, per day).
  // s(n) = visitors from s(n-1) who did step n later the same day.
  let q: SQL = sql`with s1 as (
    select visitor_hash,
           (created_at at time zone 'UTC')::date as day,
           min(created_at) as t
    from events
    where ${base} and (${match(steps[0])})
    group by 1, 2
  )`;

  for (let i = 1; i < steps.length; i++) {
    const prev = sql.raw(`s${i}`);
    const cur = sql.raw(`s${i + 1}`);
    q = sql`${q}, ${cur} as (
      select e.visitor_hash,
             (e.created_at at time zone 'UTC')::date as day,
             min(e.created_at) as t
      from events e
      join ${prev} p
        on p.visitor_hash = e.visitor_hash
       and p.day = (e.created_at at time zone 'UTC')::date
      where e.site_id = ${siteId}::uuid
        and e.created_at >= ${from}::timestamptz
        and e.created_at > p.t
        and (${match(steps[i])})
      group by 1, 2
    )`;
  }

  const counts = steps.map(
    (_, i) => sql`(select count(*)::int from ${sql.raw(`s${i + 1}`)}) as ${sql.raw(`c${i + 1}`)}`
  );
  q = sql`${q} select ${sql.join(counts, sql`, `)}`;

  const res: any = await db.execute(q);
  const row = (Array.isArray(res) ? res : res.rows)[0] as Record<string, number>;
  return steps.map((step, i) => ({ step, count: Number(row[`c${i + 1}`] ?? 0) }));
}
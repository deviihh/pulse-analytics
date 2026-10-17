import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });
const db = drizzle(neon(process.env.DATABASE_URL!));

async function main() {
  const t0 = Date.now();
  await db.execute(sql`truncate visitor_day_pages`);
  await db.execute(sql`
    insert into visitor_day_pages (site_id, day, visitor_hash, path, first_at, last_at)
    select site_id,
           (created_at at time zone 'UTC')::date,
           visitor_hash,
           path,
           min(created_at),
           max(created_at)
    from events
    where type = 'pageview'
    group by 1, 2, 3, 4
  `);
  const res: any = await db.execute(sql`select count(*)::int as n from visitor_day_pages`);
  const n = (Array.isArray(res) ? res : res.rows)[0].n;
  console.log(`visitor_day_pages: ${n} rows in ${Date.now() - t0} ms`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
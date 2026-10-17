import { sql } from "drizzle-orm";
import { db } from "../db";
import { sites } from "../db/schema";
import { getStats } from "../lib/stats";

const RUNS = 5;

async function time(label: string, fn: () => Promise<unknown>) {
  await fn();
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now();
    await fn();
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  console.log(
    `${label.padEnd(34)} median ${times[Math.floor(RUNS / 2)].toFixed(0).padStart(6)} ms   min ${times[0].toFixed(0).padStart(6)} ms`
  );
}

async function main() {
  const [site] = await db.select().from(sites).limit(1);
  const res: any = await db.execute(sql`select count(*)::int as n from events`);
  const n = (Array.isArray(res) ? res : res.rows)[0].n;
  console.log(`Events in table: ${n}\n`);

  for (const d of [7, 30, 90]) {
    await time(`${d}d  full dashboard (events)`, () => getStats(site.id, d, false));
    await time(`${d}d  full dashboard (rollup)`, () => getStats(site.id, d, true));
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
import { db } from "../db";
import { sites } from "../db/schema";
import { getFunnel } from "../lib/funnel";

const RUNS = 5;

async function main() {
  const [site] = await db.select().from(sites).limit(1);
  const steps = ["/", "/pricing", "/signup"];
  await getFunnel(site.id, steps, 30); // warm-up
  const times: number[] = [];
  let result: unknown;
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now();
    result = await getFunnel(site.id, steps, 30);
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  console.log(JSON.stringify(result));
  console.log(`funnel 30d  median ${times[Math.floor(RUNS / 2)].toFixed(0)} ms   min ${times[0].toFixed(0)} ms`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
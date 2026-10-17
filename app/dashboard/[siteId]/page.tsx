import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { getStats } from "@/lib/stats";
import { VisitorsChart } from "@/components/visitors-chart";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const nf = new Intl.NumberFormat("en-US");

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title, rows, valueKey, valueLabel,
}: {
  title: string;
  rows: { label: string; [k: string]: unknown }[];
  valueKey: string;
  valueLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey])));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">{valueLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const v = Number(r[valueKey]);
              return (
                <TableRow key={r.label}>
                  <TableCell className="relative">
                    <div
                      className="absolute inset-y-1 left-0 rounded bg-primary/10"
                      style={{ width: `${(v / max) * 100}%` }}
                    />
                    <span className="relative">{r.label}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{nf.format(v)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function SitePage({
  params, searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { siteId } = await params;
  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;

  if (!/^[0-9a-f-]{36}$/i.test(siteId)) notFound();
  const [site] = await db
    .select().from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);
  if (!site) notFound();

  const t0 = performance.now();
  const s = await getStats(siteId, days);
  const ms = Math.round(performance.now() - t0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            &larr; All sites
          </Link>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <p className="text-sm text-muted-foreground">{site.domain}</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`?days=${d}`}
              className={`rounded-md border px-3 py-1 text-sm ${
                d === days ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {d}d
            </Link>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">queries: {ms} ms</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Visitors" value={nf.format(s.totals.visitors)} />
        <StatCard title="Page views" value={nf.format(s.totals.pageviews)} />
        <StatCard
          title="Views per visitor"
          value={s.totals.visitors ? (s.totals.pageviews / s.totals.visitors).toFixed(2) : "0"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visitors and page views per day</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitorsChart data={s.series} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title="Top pages" rows={s.pages} valueKey="pageviews" valueLabel="Views" />
        <ListCard title="Sources" rows={s.sources} valueKey="visitors" valueLabel="Visitors" />
        <ListCard title="Countries" rows={s.countries} valueKey="visitors" valueLabel="Visitors" />
        <ListCard title="Devices" rows={s.devices} valueKey="visitors" valueLabel="Visitors" />
        <ListCard title="Browsers" rows={s.browsers} valueKey="visitors" valueLabel="Visitors" />
      </div>
    </main>
  );
}
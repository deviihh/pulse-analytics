import { getFunnel } from "@/lib/funnel";
import { timed } from "@/lib/timed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSteps } from "@/lib/collect-utils";

export const DEFAULT_STEPS = "/, /pricing, /signup";
const nf = new Intl.NumberFormat("en-US");

// Shared by the signed-in funnel page and the public demo funnel page.
// The caller decides who may see the site; this component only draws it.
export async function FunnelView({
  site, stepsText, days,
}: {
  site: { id: string; name: string };
  stepsText: string;
  days: number;
}) {
  const steps = parseSteps(stepsText);

  let result: { step: string; count: number }[] = [];
  let ms = 0;
  if (steps.length >= 2) {
    const run = await timed(() => getFunnel(site.id, steps, days));
    result = run.value;
    ms = run.ms;
  }
  const first = result[0]?.count ?? 0;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="text-2xl font-bold">Funnel: {site.name}</h1>
        <p className="text-sm text-muted-foreground">
          Visitors who completed each step in order, on the same day.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm">
          Steps (comma separated, 2 to 5). Use /path or event:name
          <input
            name="steps"
            defaultValue={stepsText}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Range
          <select name="days" defaultValue={String(days)} className="mt-1 block rounded-md border px-3 py-2">
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Run
        </button>
      </form>

      {steps.length < 2 ? (
        <p className="text-sm text-muted-foreground">Enter at least two valid steps.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {nf.format(first)} visitors entered &middot; query {ms} ms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.map((r, i) => {
              const ofFirst = first ? (r.count / first) * 100 : 0;
              const prev = i === 0 ? null : result[i - 1].count;
              const ofPrev = prev ? (r.count / prev) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{i + 1}. {r.step}</span>
                    <span className="tabular-nums">
                      {nf.format(r.count)}
                      {i > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          {ofPrev.toFixed(1)}% of previous &middot; {ofFirst.toFixed(1)}% of start
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-3 rounded bg-muted">
                    <div className="h-3 rounded bg-primary" style={{ width: `${ofFirst}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

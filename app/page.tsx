import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const bars = [18, 26, 22, 34, 30, 44, 40, 52, 48, 63, 58, 72, 68, 84];

const features = [
  {
    title: "No cookies, no IPs",
    body: "Visitors are counted with a one-way hash that changes every day. Nothing personal is ever stored.",
  },
  {
    title: "Hardened ingestion",
    body: "Per-site keys, origin checks, payload validation, bot filtering and rate limiting on every event.",
  },
  {
    title: "Fast at a million events",
    body: "Composite index plus daily rollup tables: a 6.8 s dashboard now loads in about 0.2 s.",
  },
  {
    title: "Funnels and custom events",
    body: "Track pulse.track('signup_click') and see how many visitors make it from pricing to signup.",
  },
];

export default async function Home() {
  const { userId } = await auth();

  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <p className="mb-4 w-fit rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-primary">
              privacy-first &middot; cookieless &middot; open to inspect
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Know your traffic.
              <br />
              <span className="text-primary">Not your visitors.</span>
            </h1>
            <p className="mt-5 max-w-md text-muted-foreground">
              Lightweight web analytics that counts visits without cookies, IP addresses or personal data.
              One script tag, one dashboard.
            </p>
            <div className="mt-8 flex gap-3">
              {userId ? (
                <Button asChild size="lg">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button size="lg">Get started</Button>
                </SignInButton>
              )}
              <Button asChild size="lg" variant="outline">
                <a href="#how">How it works</a>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs shadow-2xl">
              <div className="mb-3 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <p className="text-muted-foreground">{"<!-- paste before </body> -->"}</p>
              <p className="mt-1 break-all">
                <span className="text-primary">{"<script"}</span> defer{" "}
                src=<span className="text-amber-300">{'"https://your-app.com/analytics.js"'}</span>{" "}
                data-site=<span className="text-amber-300">{'"pk_9613f4..."'}</span>
                <span className="text-primary">{"></script>"}</span>
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-card p-4">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Visitors, last 14 days</p>
                  <p className="text-2xl font-bold tabular-nums">7,724</p>
                </div>
                <p className="font-mono text-xs text-primary">+212%</p>
              </div>
              <div className="flex h-24 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-primary/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-card p-5">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["01", "Add the script", "Paste one tag into your site. It sends page views and custom events, and sets no cookies."],
              ["02", "Events are validated", "The API checks the site key and origin, drops bots, rate-limits, then stores a daily hash instead of an IP."],
              ["03", "Read the dashboard", "SQL aggregations and rollup tables turn a million events into charts in a fraction of a second."],
            ].map(([n, t, b]) => (
              <div key={n} className="rounded-xl border border-white/10 p-5">
                <p className="font-mono text-sm text-primary">{n}</p>
                <h3 className="mt-2 font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center font-mono text-xs text-muted-foreground">
        pulse/analytics &middot; built with Next.js, Postgres and Drizzle
      </footer>
    </main>
  );
}
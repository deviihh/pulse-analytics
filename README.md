# Pulse Analytics

Privacy-first web analytics. Add one script tag to your site and see visitors, page views, top pages, traffic sources and conversion funnels, without cookies, IP addresses or personal data.

Live demo: https://pulse-analytics-pi.vercel.app (sign in to open a demo site with sample data)

## Features

- Sign-in with Clerk; all dashboard routes are protected
- Add a site and get a copy-paste tracking snippet with a unique site key
- Cookieless tracking script for page views (including single-page-app route changes) and custom events through `pulse.track("name")`
- Dashboard with visitors, page views, views per visitor, a per-day chart, and top pages, sources, countries, devices and browsers for 7, 30 or 90 days
- Funnels: choose 2 to 5 steps (pages like `/pricing` or events like `event:signup_click`) and see how many visitors complete each step in order on the same day
- Daily rollup tables keep the dashboard fast: about 2.5 s down to about 0.2 s on 500K seeded events
- Visitors are counted with a daily-rotating hash, so no IP address or personal data is stored

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Next.js route handlers and server actions |
| Database | PostgreSQL (Neon) with Drizzle ORM, raw SQL for aggregations |
| Auth | Clerk |
| Tests | Vitest |
| Hosting | Vercel, with a Vercel Cron job |

## How tracking works

1. The script reads the site key from the `data-site` attribute and sends each event to `/api/collect`. It uses `sendBeacon` with a `text/plain` body, which avoids a CORS preflight request.
2. The API rejects bodies over 4 KB, validates the JSON, looks up the site by its key, and checks that the request origin is the site's registered domain or a subdomain.
3. Requests are rate-limited to 60 per minute per IP, and bot user agents are dropped.
4. The server reads browser, OS and device from the user agent, country from the hosting provider's header, and keeps only the hostname of the referrer. UTM values are clipped and stored.
5. The visitor is identified by an HMAC-SHA256 hash of day, site, IP and user agent, keyed with a server secret. The IP address itself is never stored.
6. A daily cron job upserts two summary tables, `daily_stats` and `daily_dim_stats`. The dashboard reads those instead of scanning raw events.
7. Funnels are computed directly from the events table with chained SQL CTEs, one per step.

## Engineering notes

- Privacy by design: the day is part of the visitor hash, so the same person gets a different hash tomorrow and cannot be followed across days.
- Origin checks reject look-alike domains such as `shop.com.evil.com`. Localhost is allowed only outside production. This is covered by unit tests.
- Idempotent rollups: the job recomputes the last two UTC days with upserts, so running it again is safe.
- Ownership checks: every dashboard query filters by both site id and the signed-in user id, and the site id is validated as a UUID before it reaches the database.
- Protected cron endpoint: `/api/cron/rollup` only runs with the correct `Authorization: Bearer <CRON_SECRET>` header.
- Measured performance: `scripts/bench.ts` times the same dashboard query on raw events and on the rollup tables. `scripts/seed-bulk.ts` fills the database with test events and `scripts/bench-funnel.ts` times funnels.
- Tests: `tests/collect.test.ts` covers the visitor hash, the origin check and funnel step parsing.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | /api/collect | site key and origin check | Record a page view or custom event |
| OPTIONS | /api/collect | no | CORS preflight |
| GET | /api/cron/rollup | Bearer CRON_SECRET | Recompute the daily summary tables (`?days=1` to `60`) |

Pages (all require sign-in): `/dashboard`, `/dashboard/:siteId`, `/dashboard/:siteId/funnel`.

## Run locally

You need Node.js 20 or newer, a PostgreSQL database (Neon works) and a Clerk application.

```bash
git clone https://github.com/deviihh/pulse-analytics.git
cd pulse-analytics
npm install
```

Create a file named `.env.local` in the project root:

```
DATABASE_URL=your database connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=from the Clerk dashboard
CLERK_SECRET_KEY=from the Clerk dashboard
HASH_SECRET=any long random string
CRON_SECRET=any long random string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create the tables and start the app:

```bash
npx drizzle-kit push
npm run dev
```

Open http://localhost:3000, sign in, add a site and paste the tracking snippet into your page. To fill the dashboard with sample data, add one site first, then run:

```bash
npx tsx scripts/seed-demo.ts
npx tsx scripts/rollup.ts
```

Run the tests with `npm test`.

## Known limitations

- The dashboard reads the rollup tables, which the cron job refreshes once a day on the free Vercel plan. New events appear after the next run. A paid plan allows a more frequent schedule in `vercel.json`.
- The rate limiter is in memory, so it applies per server instance and not globally. A shared store such as Redis would fix that.
- The visitor hash changes daily, so a returning visitor counts once per day, and funnels only count steps completed on the same day.
- Funnels scan raw events instead of pre-aggregated data, so they will slow down on very large datasets.
- Sites can be added but not edited or deleted from the dashboard.
- Country comes from a Vercel request header, so it is empty when running locally.
- The performance numbers come from benchmarks on seeded data, not from real traffic.
- On free hosting, the first request after idle time is slower while the app and database wake up.

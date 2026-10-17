import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites, events } from "@/db/schema";
import { originAllowed, visitorHash as hashVisitor } from "@/lib/collect-utils";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const clip = (v: unknown, max: number) =>
  typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;

// Best-effort rate limit: 60 events per minute per IP, per server instance.
const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 60;
}

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|wget|python-requests|preview/i;
const EVENT_NAME_RE = /^[\w .:-]{1,64}$/;

function parseUA(ua: string) {
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" : "Other";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iOS/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "Other";
  const device =
    /iPad|Tablet/.test(ua) ? "tablet" :
    /Mobi|Android|iPhone/.test(ua) ? "mobile" : "desktop";
  return { browser, os, device };
}



export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let data: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 4000) return new NextResponse(null, { status: 413, headers: CORS });
    data = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400, headers: CORS });
  }

  const key = clip(data.key, 64);
  const path = clip(data.path, 500);
  if (!key || !path || !path.startsWith("/")) {
    return new NextResponse(null, { status: 400, headers: CORS });
  }

  const type = data.type === "custom" ? "custom" : "pageview";
  let name: string | null = null;
  if (type === "custom") {
    name = clip(data.name, 64);
    if (!name || !EVENT_NAME_RE.test(name)) {
      return new NextResponse(null, { status: 400, headers: CORS });
    }
  }

  let site;
  try {
    [site] = await db.select().from(sites).where(eq(sites.siteKey, key)).limit(1);
  } catch (err) {
    console.error("collect lookup failed:", err);
    return new NextResponse(null, { status: 500, headers: CORS });
  }
  if (!site) return new NextResponse(null, { status: 404, headers: CORS });

  if (!originAllowed(req.headers.get("origin"), site.domain)) {
    return new NextResponse(null, { status: 403, headers: CORS });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  if (rateLimited(ip)) return new NextResponse(null, { status: 429, headers: CORS });
  if (!ua || BOT_RE.test(ua)) return new NextResponse(null, { status: 204, headers: CORS });

  let referrer: string | null = null;
  if (type === "pageview") {
    const rawRef = clip(data.referrer, 500);
    if (rawRef) {
      try {
        const host = new URL(rawRef).hostname;
        if (host !== site.domain && !host.endsWith("." + site.domain)) referrer = host;
      } catch {}
    }
  }

  try {
    await db.insert(events).values({
      siteId: site.id,
      type,
      name,
      path,
      referrer,
      utmSource: type === "pageview" ? clip(data.utm_source, 100) : null,
      utmMedium: type === "pageview" ? clip(data.utm_medium, 100) : null,
      utmCampaign: type === "pageview" ? clip(data.utm_campaign, 100) : null,
      ...parseUA(ua),
      country: req.headers.get("x-vercel-ip-country"),
      visitorHash: hashVisitor(process.env.HASH_SECRET!, site.id, ip, ua),
    });
  } catch (err) {
    console.error("collect insert failed:", err);
    return new NextResponse(null, { status: 500, headers: CORS });
  }

  return new NextResponse(null, { status: 204, headers: CORS });
}
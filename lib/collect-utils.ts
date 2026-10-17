import { createHmac } from "crypto";

export function originAllowed(
  origin: string | null,
  domain: string,
  isProd = process.env.NODE_ENV === "production"
) {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (!isProd && host === "localhost") return true;
  return host === domain || host.endsWith("." + domain);
}

export function visitorHash(
  secret: string,
  siteId: string,
  ip: string,
  ua: string,
  now: Date = new Date()
) {
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", secret)
    .update(`${day}|${siteId}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

// Parses "/a, /b, event:x" into valid funnel steps (2 to 5 of them are used).
export function parseSteps(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 200 && (s.startsWith("/") || s.startsWith("event:")))
    .slice(0, 5);
}
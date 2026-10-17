import { describe, expect, it } from "vitest";
import { originAllowed, parseSteps, visitorHash } from "../lib/collect-utils";

const day1 = new Date("2026-10-17T10:00:00Z");
const day2 = new Date("2026-10-18T10:00:00Z");

describe("visitorHash", () => {
  it("is stable for the same visitor on the same day", () => {
    const a = visitorHash("secret", "site1", "1.2.3.4", "Chrome", day1);
    const b = visitorHash("secret", "site1", "1.2.3.4", "Chrome", day1);
    expect(a).toBe(b);
  });

  it("changes the next day, so visitors cannot be followed across days", () => {
    const a = visitorHash("secret", "site1", "1.2.3.4", "Chrome", day1);
    const b = visitorHash("secret", "site1", "1.2.3.4", "Chrome", day2);
    expect(a).not.toBe(b);
  });

  it("differs per site", () => {
    const a = visitorHash("secret", "site1", "1.2.3.4", "Chrome", day1);
    const b = visitorHash("secret", "site2", "1.2.3.4", "Chrome", day1);
    expect(a).not.toBe(b);
  });

  it("differs per visitor", () => {
    const a = visitorHash("secret", "site1", "1.2.3.4", "Chrome", day1);
    const b = visitorHash("secret", "site1", "5.6.7.8", "Chrome", day1);
    expect(a).not.toBe(b);
  });

  it("does not contain the IP address", () => {
    const h = visitorHash("secret", "site1", "1.2.3.4", "Chrome", day1);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(h).not.toContain("1.2.3.4");
  });
});

describe("originAllowed", () => {
  it("accepts the registered domain and its subdomains", () => {
    expect(originAllowed("https://shop.com", "shop.com", true)).toBe(true);
    expect(originAllowed("https://www.shop.com", "shop.com", true)).toBe(true);
  });

  it("rejects other origins and look-alike domains", () => {
    expect(originAllowed("https://evil.com", "shop.com", true)).toBe(false);
    expect(originAllowed("https://notshop.com", "shop.com", true)).toBe(false);
    expect(originAllowed("https://shop.com.evil.com", "shop.com", true)).toBe(false);
  });

  it("rejects missing or malformed origins", () => {
    expect(originAllowed(null, "shop.com", true)).toBe(false);
    expect(originAllowed("not a url", "shop.com", true)).toBe(false);
  });

  it("allows localhost only outside production", () => {
    expect(originAllowed("http://localhost:3000", "shop.com", false)).toBe(true);
    expect(originAllowed("http://localhost:3000", "shop.com", true)).toBe(false);
  });
});

describe("parseSteps", () => {
  it("parses pages and custom events", () => {
    expect(parseSteps("/, /pricing, event:signup_click")).toEqual([
      "/", "/pricing", "event:signup_click",
    ]);
  });

  it("drops invalid steps and caps the list at 5", () => {
    expect(parseSteps("pricing, /a, , /b")).toEqual(["/a", "/b"]);
    expect(parseSteps("/1,/2,/3,/4,/5,/6,/7")).toHaveLength(5);
  });
});
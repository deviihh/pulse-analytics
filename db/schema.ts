import {
  pgTable, uuid, text, timestamp, bigserial, index, date, integer, primaryKey,
} from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  siteKey: text("site_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("pageview"),
    name: text("name"),
    path: text("path").notNull(),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    browser: text("browser"),
    os: text("os"),
    device: text("device"),
    country: text("country"),
    visitorHash: text("visitor_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_site_type_created_idx").on(t.siteId, t.type, t.createdAt),
  ]
);

export const dailyStats = pgTable(
  "daily_stats",
  {
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    pageviews: integer("pageviews").notNull(),
    visitors: integer("visitors").notNull(),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.day] })]
);

export const dailyDimStats = pgTable(
  "daily_dim_stats",
  {
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    dim: text("dim").notNull(),
    label: text("label").notNull(),
    pageviews: integer("pageviews").notNull(),
    visitors: integer("visitors").notNull(),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.day, t.dim, t.label] })]
);

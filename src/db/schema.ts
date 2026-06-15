import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  brand: text("brand").notNull(),
  item_name: text("item_name").notNull(),
  category: text("category").notNull(),
  condition: text("condition").notNull(),
  sold_price: numeric("sold_price", { precision: 10, scale: 2 }).notNull(),
  platform: text("platform").notNull(),
  sold_date: date("sold_date").notNull(),
  size: text("size"),
  external_id: text("external_id").unique(),
  listing_url: text("listing_url"),
});

export const searches = pgTable("searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  query: text("query").notNull(),
  brand: text("brand").notNull(),
  condition: text("condition").notNull(),
  result_count: integer("result_count").notNull(),
  p10_price: numeric("p10_price"),
  median_price: numeric("median_price"),
  p90_price: numeric("p90_price"),
  ai_summary: text("ai_summary"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

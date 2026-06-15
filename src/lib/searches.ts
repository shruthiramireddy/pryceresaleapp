import { desc } from "drizzle-orm";
import { db } from "@/db/index";
import { searches } from "@/db/schema";

export async function getRecentSearches(limit = 20) {
  return db
    .select()
    .from(searches)
    .orderBy(desc(searches.created_at))
    .limit(limit);
}

import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/index";
import { searches } from "@/db/schema";
import { apiError, formatZodError } from "@/lib/api-errors";
import { fetchEbaySoldListings, type EbaySoldListing } from "@/lib/ebay";
import {
  computePriceStats,
  getEstimate,
  type ListingMatch,
  type PriceStats,
} from "@/lib/estimate";

const estimateRequestSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  itemName: z.string().min(1, "Item name is required"),
  condition: z.enum(["new", "like_new", "good", "fair"], {
    message: "Condition must be new, like_new, good, or fair",
  }),
  category: z.string().optional(),
  size: z.string().optional(),
});

function mapEbayToListingMatch(result: EbaySoldListing): ListingMatch {
  return {
    id: result.externalId,
    brand: result.brand,
    item_name: result.itemName,
    category: result.category,
    condition: result.condition,
    sold_price: String(result.soldPrice),
    platform: result.platform,
    sold_date: result.soldDate,
    size: result.size,
    listing_url: result.listingUrl ?? null,
    similarity: 1,
  };
}

async function getCachedSearch(
  brand: string,
  itemName: string,
  condition: string,
) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [cached] = await db
    .select()
    .from(searches)
    .where(
      and(
        eq(searches.brand, brand),
        eq(searches.query, itemName),
        eq(searches.condition, condition),
        gte(searches.created_at, twentyFourHoursAgo),
      ),
    )
    .orderBy(desc(searches.created_at))
    .limit(1);

  return cached;
}

async function saveSearch(
  brand: string,
  itemName: string,
  condition: string,
  stats: PriceStats,
) {
  await db.insert(searches).values({
    query: itemName,
    brand,
    condition,
    result_count: stats.count,
    p10_price: String(stats.p10),
    median_price: String(stats.median),
    p90_price: String(stats.p90),
    ai_summary: null,
  });
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = estimateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }

    const { brand, itemName, condition } = parsed.data;

    const ebayResults = await fetchEbaySoldListings({
      brand,
      itemName,
      condition,
    });

    if (ebayResults.length >= 1) {
      const prices = ebayResults.map((result) => result.soldPrice);
      const stats = computePriceStats(prices);
      const comps = ebayResults.map(mapEbayToListingMatch);

      await saveSearch(brand, itemName, condition, stats);

      return NextResponse.json({
        comps,
        stats,
        aiSummary: null,
        cached: false,
        liveData: true,
      });
    }

    const cached = await getCachedSearch(brand, itemName, condition);
    const result = await getEstimate({ brand, itemName, condition });

    if (result.stats.count < 1) {
      return apiError(
        "Not enough comparable sales found for this search",
        404,
      );
    }

    if (cached) {
      return NextResponse.json({
        comps: result.listings,
        stats: result.stats,
        aiSummary: null,
        cached: true,
        liveData: false,
      });
    }

    await saveSearch(brand, itemName, condition, result.stats);

    return NextResponse.json({
      comps: result.listings,
      stats: result.stats,
      aiSummary: null,
      cached: false,
      liveData: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return apiError(message, 500);
  }
}

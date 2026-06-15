import { db } from "@/db/index";

type EstimateParams = {
  brand: string;
  itemName: string;
  condition: string;
};

export type ListingMatch = {
  id: string;
  brand: string;
  item_name: string;
  category: string;
  condition: string;
  sold_price: string;
  platform: string;
  sold_date: string;
  size: string | null;
  similarity: number;
  listing_url: string | null;
};

export type PriceStats = {
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  mean: number;
  stddev: number;
  count: number;
};

export type EstimateResult = {
  listings: ListingMatch[];
  stats: PriceStats;
};

function percentile(sorted: number[], p: number) {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

export function computePriceStats(prices: number[]): PriceStats {
  const count = prices.length;

  if (count === 0) {
    return {
      p10: 0,
      p25: 0,
      median: 0,
      p75: 0,
      p90: 0,
      mean: 0,
      stddev: 0,
      count: 0,
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const mean = prices.reduce((sum, price) => sum + price, 0) / count;
  const variance =
    prices.reduce((sum, price) => sum + (price - mean) ** 2, 0) / count;

  return {
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    median: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    mean,
    stddev: Math.sqrt(variance),
    count,
  };
}

export async function getEstimate(
  params: EstimateParams,
): Promise<EstimateResult> {
  const { brand, itemName, condition } = params;

  const listings = await db.$client<ListingMatch[]>`
    SELECT
      id,
      brand,
      item_name,
      category,
      condition,
      sold_price,
      platform,
      sold_date,
      size,
      listing_url,
      similarity(item_name, ${itemName}) AS similarity
    FROM listings
    WHERE (
      item_name ILIKE ${"%" + itemName + "%"}
      OR similarity(item_name, ${itemName}) > 0.1
    )
    AND (
      LOWER(brand) = LOWER(${brand})
      OR LOWER(brand) ILIKE ${"%" + brand + "%"}
    )
    AND condition = ${condition}
    ORDER BY similarity DESC
    LIMIT 20
  `;

  const prices = listings.map((row) => Number(row.sold_price));

  return {
    listings,
    stats: computePriceStats(prices),
  };
}

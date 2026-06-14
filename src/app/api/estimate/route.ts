import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/index";
import { searches } from "@/db/schema";
import { getEstimate } from "@/lib/estimate";

const estimateRequestSchema = z.object({
  brand: z.string().min(1),
  itemName: z.string().min(1),
  condition: z.enum(["new", "like_new", "good", "fair"]),
  category: z.string().optional(),
  size: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = estimateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { brand, itemName, condition } = parsed.data;
    const result = await getEstimate({ brand, itemName, condition });

    if (result.stats.count < 3) {
      return NextResponse.json({
        insufficient: true,
        count: result.stats.count,
      });
    }

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

    if (cached) {
      return NextResponse.json({
        comps: result.listings,
        stats: result.stats,
        aiSummary: null,
        cached: true,
      });
    }

    await db.insert(searches).values({
      query: itemName,
      brand,
      condition,
      result_count: result.stats.count,
      p10_price: String(result.stats.p10),
      median_price: String(result.stats.median),
      p90_price: String(result.stats.p90),
      ai_summary: null,
    });

    return NextResponse.json({
      comps: result.listings,
      stats: result.stats,
      aiSummary: null,
      cached: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

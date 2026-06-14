import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { PriceStats } from "@/lib/estimate";

type Comp = {
  sold_price: string | number;
  platform: string;
  sold_date: string;
  size: string | null;
  condition: string;
};

const summarySchema = z.object({
  price_recommendation: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  sell_tips: z.array(z.string()).length(3),
  market_context: z.string(),
});

export type AiSummary = z.infer<typeof summarySchema>;

function summarizeComps(comps: Comp[]) {
  const platforms = [...new Set(comps.map((comp) => comp.platform))];
  const dates = comps.map((comp) => comp.sold_date).sort();
  const sizes = [...new Set(comps.map((comp) => comp.size).filter(Boolean))];

  return {
    platforms,
    dateRange:
      dates.length > 0
        ? `${dates[0]} to ${dates[dates.length - 1]}`
        : "unknown",
    sizes: sizes.length > 0 ? sizes : ["unknown"],
    count: comps.length,
  };
}

function parseSummaryJson(text: string): AiSummary {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    : trimmed;

  return summarySchema.parse(JSON.parse(jsonText));
}

export async function generateSummary(
  comps: Comp[],
  stats: PriceStats,
  brand: string,
  itemName: string,
  condition: string,
): Promise<AiSummary | null> {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const compSummary = summarizeComps(comps);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system:
        "You are a resale pricing expert. Respond with pricing guidance based on comparable sold listings and market statistics.",
      messages: [
        {
          role: "user",
          content: `Analyze this resale listing and recommend a price.

Brand: ${brand}
Item: ${itemName}
Condition: ${condition}

Price stats:
${JSON.stringify(stats)}

Comparable sales summary:
- ${compSummary.count} comps
- Platforms: ${compSummary.platforms.join(", ")}
- Date range: ${compSummary.dateRange}
- Sizes: ${compSummary.sizes.join(", ")}

Respond with ONLY a raw JSON object (no markdown, no backticks) with these exact fields:
{
  "price_recommendation": number,
  "confidence": "low" | "medium" | "high",
  "sell_tips": ["tip 1", "tip 2", "tip 3"],
  "market_context": "one sentence string"
}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return null;
    }

    return parseSummaryJson(textBlock.text);
  } catch {
    return null;
  }
}

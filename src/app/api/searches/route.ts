import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { getRecentSearches } from "@/lib/searches";

export async function GET() {
  try {
    const recentSearches = await getRecentSearches(20);
    return NextResponse.json(recentSearches);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return apiError(message, 500);
  }
}

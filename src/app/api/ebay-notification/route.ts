import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";

const VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN;
const ENDPOINT = "https://pryceresaleapp.vercel.app/api/ebay-notification";

export async function GET(req: NextRequest) {
  try {
    const challengeCode = req.nextUrl.searchParams.get("challenge_code");

    if (!challengeCode) {
      return apiError("No challenge code", 400);
    }

    if (!VERIFICATION_TOKEN) {
      return apiError("Server configuration error", 500);
    }

    const hash = createHash("sha256");
    hash.update(challengeCode);
    hash.update(VERIFICATION_TOKEN);
    hash.update(ENDPOINT);
    const challengeResponse = hash.digest("hex");

    return NextResponse.json(
      { challengeResponse },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return apiError(message, 500);
  }
}

export async function POST() {
  try {
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return apiError(message, 500);
  }
}

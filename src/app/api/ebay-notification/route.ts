import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN!;
const ENDPOINT = "https://pryceresaleapp.vercel.app/api/ebay-notification";

export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json({ error: "No challenge code" }, { status: 400 });
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
}

export async function POST() {
  // Acknowledge deletion notifications — return 200 immediately
  return new NextResponse(null, { status: 200 });
}

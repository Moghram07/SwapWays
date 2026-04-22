import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    checked: 0,
    rewarded: 0,
    qualifiedWithoutReward: 0,
    message: "Referral rewards are applied at registration in Phase 1.",
  });
}

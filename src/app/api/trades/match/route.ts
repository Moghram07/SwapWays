import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import * as tradeRepo from "@/repositories/tradeRepository";
import { findMatchesForTrade } from "@/services/matching/matchEngine";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  let body: { tradeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: "Bad request", message: "Invalid JSON" }, { status: 400 });
  }
  const tradeId = body.tradeId;
  if (!tradeId) {
    return NextResponse.json({ data: null, error: "Bad request", message: "tradeId is required" }, { status: 400 });
  }
  const trade = await tradeRepo.findTradeById(tradeId);
  if (!trade || trade.userId !== session.user.id) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "Not your trade" }, { status: 403 });
  }
  const matches = await findMatchesForTrade(tradeId);
  return NextResponse.json({ data: { matches }, error: null, message: "Matching complete" });
}

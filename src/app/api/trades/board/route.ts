import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/repositories/userRepository";
import { findTradesForBoard } from "@/repositories/tradeRepository";
import { isTradeExpired } from "@/lib/swapExpiry";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const currentUser = await findUserById(session.user.id);
  if (!currentUser?.baseId) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "No base assigned" }, { status: 403 });
  }
  const trades = await findTradesForBoard(session.user.id, currentUser.baseId);
  const now = new Date();
  const data = trades.map((t) => ({
    ...t,
    matchCount: t._count.matches,
    _count: undefined,
  })).filter((t) => !isTradeExpired(t, now));
  return NextResponse.json({ data: data, error: null, message: null });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findHighAffinityPostsForUser } from "@/repositories/matchRepository";
import { isSwapPostExpired } from "@/lib/swapExpiry";
import { withTimeout } from "@/lib/withTimeout";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  try {
    const posts = await withTimeout(
      findHighAffinityPostsForUser(session.user.id),
      5000,
      "matches query"
    );

    const now = new Date();
    const filtered = posts.filter((p) => !isSwapPostExpired(p, now));

    return NextResponse.json({ data: filtered, error: null, message: null });
  } catch (error) {
    console.error("[api/matches] degraded response due to transient DB failure", error);
    return NextResponse.json(
      {
        data: [],
        error: "ServiceUnavailable",
        message: "Matches are temporarily unavailable. Please refresh in a moment.",
      },
      { status: 503 }
    );
  }
}

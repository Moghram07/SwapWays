import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findHighAffinityPostsForUser } from "@/services/matching/matchEngine";
import { isSwapPostExpired } from "@/lib/swapExpiry";
import { TimeoutError, withTimeout } from "@/lib/withTimeout";

/** Match pipeline loads signals, may refresh many stale cache rows, then runs a 10s-capped cold batch — 5s was too tight and caused 503s. */
const MATCHES_QUERY_TIMEOUT_MS = 30_000;

/** Allow the handler to run long enough for cold cache + batch scoring on Vercel (default is often 10s). */
export const maxDuration = 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  try {
    const posts = await withTimeout(
      findHighAffinityPostsForUser(session.user.id),
      MATCHES_QUERY_TIMEOUT_MS,
      "matches query"
    );

    const now = new Date();
    const filtered = posts.filter((p) => !isSwapPostExpired(p, now));

    return NextResponse.json({ data: filtered, error: null, message: null });
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.error("[api/matches] timed out after", MATCHES_QUERY_TIMEOUT_MS, "ms");
    } else {
      console.error("[api/matches] degraded response due to transient DB failure", error);
    }
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

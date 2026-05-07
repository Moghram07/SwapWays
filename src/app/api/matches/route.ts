import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findMatchesByUserId } from "@/repositories/matchRepository";
import { withTimeout } from "@/lib/withTimeout";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | undefined;
  try {
    const matches = await withTimeout(findMatchesByUserId(session.user.id, status), 4000, "matches query");
    return NextResponse.json({ data: matches, error: null, message: null });
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

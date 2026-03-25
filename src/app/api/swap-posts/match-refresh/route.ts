import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchesForPost } from "@/services/matching/matchEngine";
import { timingSafeEqual } from "node:crypto";
import { assertStrongSecret } from "@/lib/env";

assertStrongSecret("MATCH_REFRESH_SECRET");

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Invalid refresh secret." },
    { status: 401 }
  );
}

export async function POST(request: Request) {
  const expected = process.env.MATCH_REFRESH_SECRET;
  if (!expected) {
    return NextResponse.json(
      { data: null, error: "ServerConfig", message: "MATCH_REFRESH_SECRET is not configured." },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-match-refresh-secret");
  const providedBuf = Buffer.from(provided ?? "");
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return unauthorized();
  }

  const openPosts = await prisma.swapPost.findMany({
    where: { status: "OPEN" },
    select: { id: true },
    take: 250,
    orderBy: { createdAt: "desc" },
  });

  let totalMatches = 0;
  for (const post of openPosts) {
    const matches = await findMatchesForPost(post.id);
    totalMatches += matches.length;
  }

  return NextResponse.json({
    data: { scannedPosts: openPosts.length, matchedCandidates: totalMatches },
    error: null,
    message: "Refresh completed",
  });
}

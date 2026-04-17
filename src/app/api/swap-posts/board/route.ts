import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/repositories/userRepository";
import { findSwapPostsForBoard } from "@/repositories/swapPostRepository";
import { getTradeboardForViewer } from "@/services/matching/matchEngine";
import { isSwapPostExpired } from "@/lib/swapExpiry";
import { getMatchTier, getUserAccess, truncateNotesForFree } from "@/utils/featureGates";

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const user = await findUserById(session.user.id);
  if (!user?.baseId) {
    return NextResponse.json(
      { data: null, error: "Forbidden", message: "No base assigned" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const postType = searchParams.get("postType") || undefined;
  const tripType = searchParams.get("tripType") as "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | undefined;
  const destination = searchParams.get("destination") || undefined;
  const sortBy = searchParams.get("sortBy") || "match";
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const excludeVacation = searchParams.get("excludeVacation") === "1";

  try {
    const access = await getUserAccess(session.user.id);
    const effectiveTripType = access.hasAdvancedFilters ? tripType : undefined;
    const effectiveDestination = access.hasAdvancedFilters ? destination : undefined;
    const effectiveDateFrom = access.hasAdvancedFilters ? dateFrom : undefined;
    const filters: Parameters<typeof findSwapPostsForBoard>[2] = {
      postType: postType as "OFFERING_TRIPS" | "VACATION_SWAP",
      tripType: effectiveTripType,
      destination: effectiveDestination,
      dateFrom: effectiveDateFrom,
      excludeVacation,
    };
    if (filters.postType === "VACATION_SWAP" && user.rankId) {
      filters.rankId = user.rankId;
    }
    const now = new Date();
    const posts = (await findSwapPostsForBoard(session.user.id, user.baseId, filters)).filter(
      (post) => !isSwapPostExpired(post, now)
    );
    const matchResults = await getTradeboardForViewer(
      session.user.id,
      posts.map((p) => p.id)
    );
    const matchMap = new Map(matchResults.map((m) => [m.postId, m]));

    const enriched = posts.map((post) => {
      const match = matchMap.get(post.id);
      const rawMatchPercent = match?.matchPercent ?? 0;
      const notesView = access.canSeeFullNotes
        ? { notes: post.notes, isTruncated: false }
        : truncateNotesForFree(post.notes);
      const ownerIsPriority =
        post.user.tier === "PREMIUM" &&
        (post.user.subscriptionStatus === "ACTIVE" ||
          (post.user.subscriptionStatus === "TRIALING" &&
            post.user.trialEndsAt.getTime() > Date.now()));
      const totalBlock = post.offeredTrips.reduce(
        (sum, t) => sum + (t.blockHours ?? t.creditHours ?? 0),
        0
      );
      const firstDate = post.offeredTrips
        .map((t) => new Date(t.departureDate))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      return {
        ...post,
        notes: notesView.notes,
        notesIsTruncated: notesView.isTruncated,
        userTier: access.tier,
        matchPercent: access.canSeeExactMatch ? rawMatchPercent : null,
        matchTier: getMatchTier(rawMatchPercent),
        matchBreakdown: access.canSeeExactMatch ? match?.breakdown ?? null : null,
        matchingTrips: match?.matchingTrips ?? [],
        matchReasons: access.canSeeExactMatch ? match?.reasons ?? [] : [],
        failReason: match?.failReason ?? null,
        bestTripIndex: match?.bestTripIndex ?? null,
        priorityPlacement: ownerIsPriority,
        __sortBlock: totalBlock,
        __sortDate: firstDate ? firstDate.getTime() : Number.MAX_SAFE_INTEGER,
      };
    });

    const sorted = enriched.sort((a, b) => {
      if (a.priorityPlacement && !b.priorityPlacement) return -1;
      if (!a.priorityPlacement && b.priorityPlacement) return 1;
      if (sortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "block_high") return b.__sortBlock - a.__sortBlock;
      if (sortBy === "block_low") return a.__sortBlock - b.__sortBlock;
      if (sortBy === "date_soon") return a.__sortDate - b.__sortDate;
      const aScore = typeof a.matchPercent === "number" ? a.matchPercent : 0;
      const bScore = typeof b.matchPercent === "number" ? b.matchPercent : 0;
      if (aScore > 0 && bScore === 0) return -1;
      if (aScore === 0 && bScore > 0) return 1;
      return bScore - aScore;
    });

    return json(
      sorted.map(({ __sortBlock: _block, __sortDate: _date, ...item }) => item)
    );
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      console.error("[swap-posts/board] Database table missing. Run: npx prisma db push");
      return NextResponse.json(
        { data: null, error: "ServerConfig", message: "Trade board is not available. Please try again later." },
        { status: 503 }
      );
    }
    console.error("[swap-posts/board]", err);
    return NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to load trade board." },
      { status: 500 }
    );
  }
}

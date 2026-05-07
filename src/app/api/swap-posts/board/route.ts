import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findSwapPostsForBoard } from "@/repositories/swapPostRepository";
import { getTradeboardForViewer } from "@/services/matching/matchEngine";
import { isSwapPostExpired } from "@/lib/swapExpiry";
import { getMatchTier, getUserAccess, truncateNotesForFree } from "@/utils/featureGates";
import { withTiming } from "@/lib/apiTimer";
import { prisma } from "@/lib/prisma";
import { trackSession } from "@/lib/sessionTracker";

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  const timer = withTiming("GET /api/swap-posts/board");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return timer.end(unauthorized());

  // Fire-and-forget — session tracking must never block the primary request
  void trackSession(session.user.id, request);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { baseId: true, rankId: true },
  });
  if (!user?.baseId) {
    return timer.end(NextResponse.json(
      { data: null, error: "Forbidden", message: "No base assigned" },
      { status: 403 }
    ));
  }

  const { searchParams } = new URL(request.url);
  const postType = searchParams.get("postType") || undefined;
  const tripType = searchParams.get("tripType") as "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | undefined;
  const destination = searchParams.get("destination") || undefined;
  const requestedSortBy = searchParams.get("sortBy") || "match";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const excludeVacation = searchParams.get("excludeVacation") === "1";

  // DB-level filters that don't depend on access tier
  const dbFilters: Parameters<typeof findSwapPostsForBoard>[2] = {
    postType: postType as "OFFERING_TRIPS" | "VACATION_SWAP",
    excludeVacation,
  };
  if (postType === "VACATION_SWAP" && user.rankId) {
    dbFilters.rankId = user.rankId;
  }

  try {
    // Fetch access rules and board posts in parallel — they are independent DB calls
    const [access, rawPosts] = await Promise.all([
      getUserAccess(session.user.id),
      findSwapPostsForBoard(session.user.id, user.baseId, dbFilters),
    ]);

    const sortBy = access.canSeeExactMatch ? requestedSortBy : requestedSortBy === "match" ? "recent" : requestedSortBy;
    const effectiveTripType = access.hasAdvancedFilters ? tripType : undefined;
    const effectiveDestination = access.hasAdvancedFilters ? destination : undefined;
    const effectiveDateFrom = access.hasAdvancedFilters ? dateFrom : undefined;

    const now = new Date();
    const posts = rawPosts
      .filter((post) => !isSwapPostExpired(post, now))
      .filter((post: any) => {
        if (effectiveTripType && post.postType !== "VACATION_SWAP") {
          const match =
            post.offeredTrips?.some((t: any) => t.tripType === effectiveTripType) ||
            post.quickTripType === effectiveTripType;
          if (!match) return false;
        }
        if (effectiveDestination) {
          const wanted = effectiveDestination.toUpperCase();
          const match =
            post.offeredTrips?.some((t: any) => t.destination?.toUpperCase() === wanted) ||
            (post.quickDestinations ?? []).some((d: string) => d.toUpperCase() === wanted);
          if (!match) return false;
        }
        if (effectiveDateFrom) {
          const fromDate = new Date(`${effectiveDateFrom}T00:00:00.000Z`);
          if (!Number.isNaN(fromDate.getTime())) {
            if (post.postType === "VACATION_SWAP") {
              if (post.vacationStartDate) return new Date(post.vacationStartDate) >= fromDate;
              if (post.vacationYear && post.vacationMonth && post.vacationStartDay) {
                const d = new Date(Date.UTC(post.vacationYear, post.vacationMonth - 1, post.vacationStartDay));
                return d >= fromDate;
              }
              return false;
            }
            const match =
              post.offeredTrips?.some((t: any) => new Date(t.departureDate) >= fromDate) ||
              (post.quickDate ? new Date(post.quickDate) >= fromDate : false);
            if (!match) return false;
          }
        }
        return true;
      });

    const matchResults = await getTradeboardForViewer(
      session.user.id,
      posts.map((p) => p.id),
      { maxCompute: 5 }
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
        (sum: number, t: { blockHours?: number | null; creditHours?: number | null }) =>
          sum + (t.blockHours ?? t.creditHours ?? 0),
        0
      );
      const firstDate = post.offeredTrips
        .map((t: { departureDate: string | Date }) => new Date(t.departureDate))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
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

    const clean = sorted.map((item) => {
      const { __sortBlock, __sortDate, ...rest } = item;
      void __sortBlock;
      void __sortDate;
      return rest;
    });
    const startIndex = cursor ? clean.findIndex((item) => item.id === cursor) + 1 : 0;
    const pageSlice = clean.slice(startIndex, startIndex + limit + 1);
    const hasMore = pageSlice.length > limit;
    const data = hasMore ? pageSlice.slice(0, limit) : pageSlice;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;
    return timer.end(
      NextResponse.json({ data, nextCursor, hasMore, error: null, message: null })
    );
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      console.error("[swap-posts/board] Database table missing. Run: npx prisma db push");
      return timer.end(NextResponse.json(
        { data: null, error: "ServerConfig", message: "Trade board is not available. Please try again later." },
        { status: 503 }
      ));
    }
    console.error("[swap-posts/board]", err);
    return timer.end(NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to load trade board." },
      { status: 500 }
    ));
  }
}

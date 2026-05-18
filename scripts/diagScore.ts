import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { prisma } from "../src/lib/prisma";
import { buildViewerSignals } from "../src/services/matching/viewerSignals";
import { scoreSwapPost } from "../src/services/matching/swapPostScorer";
import type { PostLike } from "../src/services/matching/softScoring";
import type { WantType } from "../src/types/enums";

async function scoreForViewer(viewerId: string) {
  const signals = await buildViewerSignals(viewerId);
  console.log(`\n=== VIEWER ${viewerId.slice(-8)} SIGNALS ===`);
  console.log({ wantTypes: signals.wantTypes, hasAnyDestinationFlex: signals.hasAnyDestinationFlex });

  const posts = await prisma.swapPost.findMany({
    where: { status: "OPEN", userId: { not: viewerId } },
    include: { offeredTrips: true },
  });

  console.log(`\n=== SCORES (${posts.length} posts) ===`);
  for (const post of posts) {
    const posterTripTypes = [
      ...post.offeredTrips.map((t) => t.tripType),
      ...(post.quickTripType ? [post.quickTripType] : []),
    ];
    const postLike: PostLike = {
      wantType: post.wantType as WantType,
      wantDestinations: post.wantDestinations ?? [],
      wantExclude: post.wantExclude ?? [],
      wantMinLayover: post.wantMinLayover ?? null,
      offeredTrips: post.offeredTrips.map((t) => ({
        departureDate: t.departureDate,
        destination: t.destination,
        creditHours: t.creditHours,
        blockHours: t.blockHours ?? null,
        hasLayover: t.hasLayover,
        layoverHours: t.layoverHours,
        tripType: t.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP",
        scheduleTrip: null,
      })),
      wtfDays: post.wtfDays ?? [],
      quickTripType: (post.quickTripType ?? null) as "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null,
      quickDestinations: post.quickDestinations ?? [],
      quickDate: post.quickDate ?? null,
      quickLayoverHours: post.quickLayoverHours ?? null,
      advancedBlockHours: post.advancedBlockHours ?? null,
    };
    const score = scoreSwapPost(signals, postLike);
    // Only flag as bug if viewer wants LAYOVER (not ROUND_TRIP, which correctly maps to TURNAROUND)
    const viewerWantsLayoverOnly = signals.wantTypes.includes("LAYOVER") || signals.wantTypes.includes("LONGER_LAYOVER");
    const hasTripMismatch = posterTripTypes.some((t) => t === "TURNAROUND") && score.reasons.includes("Same trip type") && viewerWantsLayoverOnly;
    if (hasTripMismatch) console.log("⚠️  BUG: LAYOVER viewer matched TURNAROUND post with 'Same trip type'!");
    console.log({ postId: post.id.slice(-8), posterTripTypes: [...new Set(posterTripTypes)], score: score.total, reasons: score.reasons });
  }
}

async function main() {
  // Check all viewers who have open posts
  const users = await prisma.swapPost.findMany({
    where: { status: "OPEN" },
    select: { userId: true },
    distinct: ["userId"],
  });
  for (const { userId } of users) {
    await scoreForViewer(userId);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLineSwapHardConstraints, scoreLineSwapMatch } from "@/services/matching/lineSwapMatcher";
import { isLineSwapExpired } from "@/lib/swapExpiry";

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

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      baseId: true,
      rankId: true,
      rank: { select: { code: true, category: true } },
      hasUsVisa: true,
      hasChinaVisa: true,
    },
  });
  if (!viewer?.baseId) return json([]);

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || undefined;
  const destination = searchParams.get("destination")?.toUpperCase() || undefined;
  const reserve = searchParams.get("reserve");
  const now = new Date();

  let posts = await prisma.lineSwapPost.findMany({
    where: {
      status: "OPEN",
      userId: { not: session.user.id },
      user: { baseId: viewer.baseId },
      ...(month ? { month } : {}),
      ...(reserve === "yes" ? { hasReserve: true } : {}),
      ...(reserve === "no" ? { hasReserve: false } : {}),
    },
    include: {
      user: {
        select: {
          firstName: true,
          rankId: true,
          rank: { select: { name: true, code: true, category: true } },
          base: { select: { name: true, airportCode: true } },
          hasUsVisa: true,
          hasChinaVisa: true,
        },
      },
      layovers: true,
    },
    orderBy: { createdAt: "desc" },
  });
  posts = posts.filter((p) => !isLineSwapExpired(p, now));

  const viewerLine =
    (await prisma.lineSwapPost.findFirst({
      where: { userId: session.user.id, status: "OPEN" },
      include: { layovers: { select: { destination: true } } },
      orderBy: { createdAt: "desc" },
    })) ??
    (await prisma.lineSwapPost.findFirst({
      where: { userId: session.user.id },
      include: { layovers: { select: { destination: true } } },
      orderBy: { createdAt: "desc" },
    }));
  const activeViewerLine = viewerLine && !isLineSwapExpired(viewerLine, now) ? viewerLine : null;

  // Apply rank and visa hard constraints
  posts = posts.filter((post) => {
    const result = checkLineSwapHardConstraints(
      { rankId: viewer.rankId, rank: viewer.rank, hasUsVisa: viewer.hasUsVisa, hasChinaVisa: viewer.hasChinaVisa },
      { rankId: post.user.rankId, rank: post.user.rank, hasUsVisa: post.user.hasUsVisa, hasChinaVisa: post.user.hasChinaVisa },
      { lineType: post.lineType, layovers: post.layovers },
      activeViewerLine ? { lineType: activeViewerLine.lineType, layovers: activeViewerLine.layovers } : null
    );
    return result.passes;
  });

  if (destination) {
    posts = posts.filter((p) =>
      p.layovers.some((l) => l.destination.toUpperCase() === destination)
    );
  }

  const enriched = posts.map((post) => {
    const match = scoreLineSwapMatch(
      activeViewerLine
        ? {
            lineType: activeViewerLine.lineType,
            daysOffStart: activeViewerLine.daysOffStart,
            daysOffEnd: activeViewerLine.daysOffEnd,
            hasReserve: activeViewerLine.hasReserve,
            layovers: activeViewerLine.layovers,
            wantLineType: activeViewerLine.wantLineType,
            wantDaysOffStart: activeViewerLine.wantDaysOffStart,
            wantDaysOffEnd: activeViewerLine.wantDaysOffEnd,
            wantDestination: activeViewerLine.wantDestination,
            wantNoReserve: activeViewerLine.wantNoReserve,
          }
        : null,
      {
        lineType: post.lineType,
        daysOffStart: post.daysOffStart,
        daysOffEnd: post.daysOffEnd,
        hasReserve: post.hasReserve,
        layovers: post.layovers,
        wantLineType: post.wantLineType,
        wantDaysOffStart: post.wantDaysOffStart,
        wantDaysOffEnd: post.wantDaysOffEnd,
        wantDestination: post.wantDestination,
        wantNoReserve: post.wantNoReserve,
      }
    );

    return {
      ...post,
      matchPercent: match.score,
      matchReasons: match.reasons,
    };
  });

  return json(enriched);
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CreateLineSwapPostInput } from "@/types/lineSwap";
import type { LineType } from "@/types/enums";
import { isLineSwapExpired } from "@/lib/swapExpiry";
import { trackEventServer } from "@/lib/analytics/server";

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function isMonthName(month: string): boolean {
  return [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ].includes(month);
}

const LINE_TYPES: LineType[] = ["NORMAL", "US_LINE", "CHINA_LINE", "RESERVE_LINE"];

function isLineType(value: unknown): value is LineType {
  return typeof value === "string" && LINE_TYPES.includes(value as LineType);
}

function normalizeReserveDays(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<number>();
  for (const day of input) {
    if (!Number.isInteger(day)) continue;
    if (day < 1 || day > 31) continue;
    unique.add(day);
  }
  return Array.from(unique).sort((a, b) => a - b);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const countOnly = searchParams.get("count") === "1";
  const status = searchParams.get("status");
  const now = new Date();

  if (!mine) {
    return NextResponse.json(
      {
        data: null,
        error: "Validation",
        message: "Use /api/line-swap/board for board data, or add ?mine=1 for your posts.",
      },
      { status: 400 }
    );
  }

  const where = {
    userId: session.user.id,
    ...(status ? { status: status as "OPEN" | "IN_NEGOTIATION" | "AGREED" | "COMPLETED" | "EXPIRED" | "CANCELLED" } : {}),
  };

  if (countOnly) {
    const posts = await prisma.lineSwapPost.findMany({
      where,
      select: { month: true, year: true },
    });
    const total = posts.filter((post) => !isLineSwapExpired(post, now)).length;
    return json({ total });
  }

  const posts = await prisma.lineSwapPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { layovers: true },
  });
  return json(posts.filter((post) => !isLineSwapExpired(post, now)));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const body = (await request.json().catch(() => null)) as CreateLineSwapPostInput | null;
  if (!body) {
    return NextResponse.json(
      { data: null, error: "Validation", message: "Invalid payload." },
      { status: 400 }
    );
  }

  if (
    !body.lineNumber ||
    !isLineType(body.lineType) ||
    !body.month ||
    !Number.isInteger(body.year) ||
    !Number.isInteger(body.daysOffStart) ||
    !Number.isInteger(body.daysOffEnd) ||
    body.daysOffStart < 1 ||
    body.daysOffEnd > 31 ||
    body.daysOffStart > body.daysOffEnd ||
    !isMonthName(body.month)
  ) {
    return NextResponse.json(
      { data: null, error: "Validation", message: "Invalid line swap values." },
      { status: 422 }
    );
  }

  if (body.wantLineType != null && !isLineType(body.wantLineType)) {
    return NextResponse.json(
      { data: null, error: "Validation", message: "Invalid preferred line type." },
      { status: 422 }
    );
  }

  const reserveDays = normalizeReserveDays(body.reserveDays);
  const wantDestination = body.wantDestination?.trim().toUpperCase() || null;

  const post = await prisma.$transaction(async (tx) => {
    const lineSwap = await tx.lineSwapPost.create({
      data: {
        userId: session.user.id,
        lineNumber: body.lineNumber.trim(),
        lineType: body.lineType,
        month: body.month,
        year: body.year,
        totalBlock: body.totalBlock ?? null,
        daysOffStart: body.daysOffStart,
        daysOffEnd: body.daysOffEnd,
        hasReserve: !!body.hasReserve,
        reserveDays,
        wantDaysOffStart: body.wantDaysOffStart ?? null,
        wantDaysOffEnd: body.wantDaysOffEnd ?? null,
        wantDestination,
        wantLineType: body.wantLineType ?? null,
        wantNoReserve: !!body.wantNoReserve,
        notes: body.notes?.trim() || null,
        scheduleId: body.scheduleId ?? null,
      },
    });

    if (body.layovers?.length) {
      await tx.lineSwapLayover.createMany({
        data: body.layovers
          .filter((l) => l.destination && (l.hours > 0 || (l.minutes ?? 0) > 0))
          .map((l) => ({
            lineSwapPostId: lineSwap.id,
            destination: l.destination.toUpperCase(),
            durationHours: l.hours + (l.minutes ?? 0) / 60,
            durationRaw: `${l.hours}.${String(l.minutes ?? 0).padStart(2, "0")}`,
          })),
      });
    }

    return tx.lineSwapPost.findUnique({
      where: { id: lineSwap.id },
      include: { layovers: true },
    });
  });

  await trackEventServer({
    eventName: "swap_post_created",
    userId: session.user.id,
    path: "/dashboard/add-trade?type=line-swap",
    properties: { postType: "LINE_SWAP" },
  }).catch(() => {});

  return json(post);
}

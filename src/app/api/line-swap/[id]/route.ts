import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CreateLineSwapPostInput } from "@/types/lineSwap";
import type { LineType } from "@/types/enums";

function unauthorized() {
  return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

const LINE_TYPES: LineType[] = ["NORMAL", "US_LINE", "CHINA_LINE", "RESERVE_LINE", "KULN", "INDO", "HJLN", "TRNG"];

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const post = await prisma.lineSwapPost.findUnique({
    where: { id },
    include: { layovers: true },
  });

  if (!post) return NextResponse.json({ data: null, error: "Not found", message: "Post not found" }, { status: 404 });
  if (post.userId !== session.user.id) return NextResponse.json({ data: null, error: "Forbidden", message: "Not your post" }, { status: 403 });

  return json(post);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const post = await prisma.lineSwapPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ data: null, error: "Not found", message: "Post not found" }, { status: 404 });
  if (post.userId !== session.user.id) return NextResponse.json({ data: null, error: "Forbidden", message: "Not your post" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as CreateLineSwapPostInput | null;
  if (!body) return NextResponse.json({ data: null, error: "Validation", message: "Invalid payload." }, { status: 400 });

  if (
    !body.lineNumber ||
    !isLineType(body.lineType) ||
    !Number.isInteger(body.daysOffStart) ||
    !Number.isInteger(body.daysOffEnd) ||
    body.daysOffStart < 1 ||
    body.daysOffEnd > 31 ||
    body.daysOffStart > body.daysOffEnd
  ) {
    return NextResponse.json({ data: null, error: "Validation", message: "Invalid line swap values." }, { status: 422 });
  }

  if (body.wantLineType != null && !isLineType(body.wantLineType)) {
    return NextResponse.json({ data: null, error: "Validation", message: "Invalid preferred line type." }, { status: 422 });
  }

  const reserveDays = normalizeReserveDays(body.reserveDays);
  const wantDestination = body.wantDestination?.trim().toUpperCase() || null;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.lineSwapLayover.deleteMany({ where: { lineSwapPostId: id } });

    if (body.layovers?.length) {
      await tx.lineSwapLayover.createMany({
        data: body.layovers
          .filter((l) => l.destination && (l.hours > 0 || (l.minutes ?? 0) > 0))
          .map((l) => ({
            lineSwapPostId: id,
            destination: l.destination.toUpperCase(),
            durationHours: l.hours + (l.minutes ?? 0) / 60,
            durationRaw: `${l.hours}.${String(l.minutes ?? 0).padStart(2, "0")}`,
          })),
      });
    }

    return tx.lineSwapPost.update({
      where: { id },
      data: {
        lineNumber: body.lineNumber.trim(),
        lineType: body.lineType,
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
      },
      include: { layovers: true },
    });
  });

  return json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const post = await prisma.lineSwapPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ data: null, error: "Not found", message: "Post not found" }, { status: 404 });
  if (post.userId !== session.user.id) return NextResponse.json({ data: null, error: "Forbidden", message: "Not your post" }, { status: 403 });

  await prisma.lineSwapPost.update({ where: { id }, data: { status: "CANCELLED" } });

  return json({ cancelled: true });
}

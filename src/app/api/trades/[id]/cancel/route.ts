import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const trade = await prisma.trade.findUnique({
    where: { id },
  });

  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  if (trade.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (trade.status === "COMPLETED") {
    return NextResponse.json({ error: "Cannot cancel a completed swap" }, { status: 400 });
  }

  await prisma.match.updateMany({
    where: { tradeId: id, status: "PENDING" },
    data: { status: "REJECTED", rejectionReason: "Trade cancelled by user" },
  });

  const updated = await prisma.trade.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  if (trade.scheduleTripId) {
    await prisma.swapPost.updateMany({
      where: {
        offeredTrips: { some: { scheduleTripId: trade.scheduleTripId } },
      },
      data: { status: "CANCELLED" },
    });
  }

  return NextResponse.json({ data: updated });
}

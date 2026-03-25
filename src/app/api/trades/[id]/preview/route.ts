import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET trade with scheduleTrip for preview (e.g. Start Chat modal). Any authenticated user can view OPEN trades. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const { id } = await params;
  const trade = await prisma.trade.findUnique({
    where: { id, status: "OPEN" },
    include: {
      user: { select: { id: true, firstName: true, rank: { select: { name: true } }, base: { select: { name: true } } } },
      scheduleTrip: { include: { legs: true, layovers: true } },
    },
  });
  if (!trade) {
    return NextResponse.json({ data: null, error: "Not found", message: "Trade not found" }, { status: 404 });
  }
  if (trade.userId === session.user.id) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "Cannot message your own trade" }, { status: 403 });
  }
  return NextResponse.json({ data: trade, error: null, message: null });
}

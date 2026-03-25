import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import * as tradeRepo from "@/repositories/tradeRepository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const { id } = await params;
  const trade = await tradeRepo.findTradeById(id);
  if (!trade) {
    return NextResponse.json({ data: null, error: "Not found", message: "Trade not found" }, { status: 404 });
  }
  if (trade.userId !== session.user.id) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "Not your trade" }, { status: 403 });
  }
  return NextResponse.json({ data: trade, error: null, message: null });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const { id } = await params;
  const trade = await tradeRepo.findTradeById(id);
  if (!trade || trade.userId !== session.user.id) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "Not your trade" }, { status: 403 });
  }
  if (trade.status !== "OPEN") {
    return NextResponse.json({ data: null, error: "Bad request", message: "Only open trades can be updated" }, { status: 400 });
  }
  // Minimal update: only status/cancel for MVP; full update can be added later
  const body = await request.json().catch(() => ({}));
  if (body.status === "CANCELLED") {
    const updated = await tradeRepo.updateTradeStatus(id, "CANCELLED");
    return NextResponse.json({ data: updated, error: null, message: "Trade cancelled" });
  }
  return NextResponse.json({ data: trade, error: null, message: null });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const { id } = await params;
  const trade = await tradeRepo.findTradeById(id);
  if (!trade || trade.userId !== session.user.id) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "Not your trade" }, { status: 403 });
  }
  await tradeRepo.deleteTrade(id);
  return NextResponse.json({ data: { deleted: id }, error: null, message: "Trade deleted" });
}

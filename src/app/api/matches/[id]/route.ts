import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findMatchById, updateMatchStatus, isValidMatchStatusTransition } from "@/repositories/matchRepository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const { id } = await params;
  const match = await findMatchById(id);
  if (!match) {
    return NextResponse.json({ data: null, error: "Not found", message: "Match not found" }, { status: 404 });
  }
  if (match.offererId !== session.user.id && match.receiverId !== session.user.id) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "Not your match" }, { status: 403 });
  }
  return NextResponse.json({ data: match, error: null, message: null });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const { id } = await params;
  const match = await findMatchById(id);
  if (!match) {
    return NextResponse.json({ data: null, error: "Not found", message: "Match not found" }, { status: 404 });
  }
  const canAct = match.offererId === session.user.id || match.receiverId === session.user.id;
  if (!canAct) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "Not your match" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { status, rejectionReason } = body as { status?: string; rejectionReason?: string };
  if (!status || !["ACCEPTED", "REJECTED", "EXPIRED"].includes(status)) {
    return NextResponse.json(
      { data: null, error: "BadRequest", message: "Invalid or missing status" },
      { status: 400 }
    );
  }
  if (!isValidMatchStatusTransition(match.status, status)) {
    return NextResponse.json(
      { data: null, error: "Conflict", message: `Cannot transition from ${match.status} to ${status}` },
      { status: 409 }
    );
  }
  const updated = await updateMatchStatus(id, status as "ACCEPTED" | "REJECTED" | "EXPIRED", rejectionReason);
  return NextResponse.json({ data: updated, error: null, message: `Match ${status.toLowerCase()}` });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findMatchesByUserId } from "@/repositories/matchRepository";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | undefined;
  const matches = await findMatchesByUserId(session.user.id, status);
  return NextResponse.json({ data: matches, error: null, message: null });
}

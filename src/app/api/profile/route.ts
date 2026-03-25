import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById, updateUser, setUserQualifications } from "@/repositories/userRepository";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const user = await findUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ data: null, error: "Not found", message: "User not found" }, { status: 404 });
  }
  const { passwordHash: _, ...safe } = user;
  return NextResponse.json({ data: safe, error: null, message: null });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const { firstName, lastName, phone, rankId, baseId, qualificationIds } = body as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    rankId?: string;
    baseId?: string;
    qualificationIds?: string[];
    hasUsVisa?: boolean;
    hasChinaVisa?: boolean;
  };
  const current = await findUserById(session.user.id);
  if (!current) {
    return NextResponse.json({ data: null, error: "Not found", message: "User not found" }, { status: 404 });
  }

  if (rankId) {
    const rank = await prisma.rank.findFirst({
      where: { id: rankId, airlineId: current.airlineId },
      select: { id: true },
    });
    if (!rank) {
      return NextResponse.json({ data: null, error: "Validation", message: "Invalid rank selection." }, { status: 422 });
    }
  }

  if (baseId) {
    const base = await prisma.base.findFirst({
      where: { id: baseId, airlineId: current.airlineId },
      select: { id: true },
    });
    if (!base) {
      return NextResponse.json({ data: null, error: "Validation", message: "Invalid base selection." }, { status: 422 });
    }
  }

  if (qualificationIds && Array.isArray(qualificationIds)) {
    const validCount = await prisma.aircraftType.count({
      where: { id: { in: qualificationIds }, airlineId: current.airlineId },
    });
    if (validCount !== qualificationIds.length) {
      return NextResponse.json(
        { data: null, error: "Validation", message: "One or more qualification IDs are invalid." },
        { status: 422 }
      );
    }
    await setUserQualifications(session.user.id, qualificationIds);
  }
  const updated = await updateUser(session.user.id, {
    firstName,
    lastName,
    phone,
    rankId,
    baseId,
    hasUsVisa: typeof body.hasUsVisa === "boolean" ? body.hasUsVisa : undefined,
    hasChinaVisa: typeof body.hasChinaVisa === "boolean" ? body.hasChinaVisa : undefined,
  });
  const { passwordHash: _, ...safe } = updated;
  return NextResponse.json({ data: safe, error: null, message: "Profile updated" });
}

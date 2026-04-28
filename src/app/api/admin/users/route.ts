import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const filter = (searchParams.get("filter") || "all").toLowerCase();
  const now = new Date();

  const parts: Prisma.UserWhereInput[] = [];

  if (search) {
    parts.push({
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (filter === "premium") {
    parts.push({
      OR: [
        { tier: "PREMIUM", subscriptionStatus: "ACTIVE" },
        { tier: "PREMIUM", subscriptionStatus: "TRIALING", trialEndsAt: { gt: now } },
      ],
    });
  } else if (filter === "free") {
    parts.push({ tier: "FREE" });
  } else if (filter === "trialing") {
    parts.push({ subscriptionStatus: "TRIALING", trialEndsAt: { gt: now } });
  } else if (filter === "verified") {
    parts.push({ isVerified: true });
  } else if (filter === "unverified") {
    parts.push({ isVerified: false });
  }

  const where: Prisma.UserWhereInput = parts.length > 0 ? { AND: parts } : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      tier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      trialStartedAt: true,
      isVerified: true,
      createdAt: true,
      rank: { select: { name: true } },
      base: { select: { name: true, airportCode: true } },
    },
  });

  const enriched = users.map((u) => {
    const daysRemaining = Math.ceil((u.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return {
      ...u,
      daysRemaining,
      isExpired: daysRemaining < 0,
    };
  });

  return json(enriched);
}

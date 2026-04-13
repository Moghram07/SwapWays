import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expiredUsers = await prisma.user.findMany({
    where: {
      subscriptionStatus: "TRIALING",
      trialEndsAt: { lte: now },
    },
    select: { id: true, email: true },
  });

  const result = await prisma.user.updateMany({
    where: {
      subscriptionStatus: "TRIALING",
      trialEndsAt: { lte: now },
    },
    data: {
      tier: "FREE",
      subscriptionStatus: "EXPIRED",
    },
  });

  return NextResponse.json({
    expired: result.count,
    users: expiredUsers.length,
  });
}

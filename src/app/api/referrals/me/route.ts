import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true, referralBonusCount: true },
  });
  if (!user) {
    return NextResponse.json({ data: null, error: "Not found", message: "User not found" }, { status: 404 });
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      referredUserId: true,
      bonusDays: true,
      createdAt: true,
      referred: {
        select: { email: true, firstName: true, lastName: true },
      },
    },
  });
  const usedReferrals = Math.min(user.referralBonusCount, 3);
  const referralCodeValue = user.referralCode ?? "";
  const appUrl = process.env.NEXTAUTH_URL ?? "https://swapways.com";
  const referralLink = referralCodeValue ? `${appUrl}/register?ref=${encodeURIComponent(referralCodeValue)}` : null;

  return NextResponse.json({
    data: {
      referralCode: referralCodeValue,
      referralLink,
      usedReferrals,
      remainingReferrals: Math.max(0, 3 - usedReferrals),
      referralBonusCount: user.referralBonusCount,
      history: referrals.map((ref) => ({
        referredUserId: ref.referredUserId,
        referredName: `${ref.referred.firstName} ${ref.referred.lastName}`.trim(),
        referredEmail: ref.referred.email,
        bonusDays: ref.bonusDays,
        createdAt: ref.createdAt,
      })),
    },
    error: null,
    message: null,
  });
}

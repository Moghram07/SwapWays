import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeReferralCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function ensureReferralCode(userId: string, existingCode: string | null): Promise<string> {
  if (existingCode) return existingCode;

  for (let i = 0; i < 8; i += 1) {
    const candidate = makeReferralCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: candidate },
        select: { referralCode: true },
      });
      if (updated.referralCode) return updated.referralCode;
    } catch {
      // Unique collision or concurrent update; retry candidate.
    }
  }
  throw new Error("Failed to assign referral code");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      referralCode: true,
      referralBonusCount: true,
      referredBy: true,
      trialExtended: true,
    },
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
  const startingDays = user.referredBy ? 20 : 10;
  const scheduleBonusDays = user.trialExtended ? 10 : 0;
  const referralBonusDays = usedReferrals * 10;
  const totalGrantedDays = Math.min(50, startingDays + scheduleBonusDays + referralBonusDays);
  const trialCapReached = totalGrantedDays >= 50;
  const referralCodeValue = await ensureReferralCode(session.user.id, user.referralCode);
  const appUrl = process.env.NEXTAUTH_URL ?? "https://swapways.com";
  const referralLink = referralCodeValue ? `${appUrl}/register?ref=${encodeURIComponent(referralCodeValue)}` : null;

  return NextResponse.json({
    data: {
      referralCode: referralCodeValue,
      referralLink,
      usedReferrals,
      remainingReferrals: Math.max(0, 3 - usedReferrals),
      trialCapReached,
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

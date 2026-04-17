import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

/**
 * Admin tier updates align with `getUserAccess` in `featureGates.ts`:
 * - PREMIUM + ACTIVE => full premium capabilities (admin grant / paid).
 * - FREE + EXPIRED => free tier (trial ended or revoked).
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { userId?: string; tier?: string };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const tier = body.tier === "PREMIUM" || body.tier === "FREE" ? body.tier : null;
  if (!userId || !tier) return error("userId and tier (FREE | PREMIUM) are required", 400);

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!existing) return error("User not found", 404);

  const now = new Date();
  const data =
    tier === "PREMIUM"
      ? {
          tier: "PREMIUM" as const,
          subscriptionStatus: "ACTIVE" as const,
          trialEndsAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        }
      : {
          tier: "FREE" as const,
          subscriptionStatus: "EXPIRED" as const,
          trialEndsAt: now,
        };

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      tier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });

  return json(updated);
}

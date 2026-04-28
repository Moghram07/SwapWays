import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { requireSameOrigin } from "@/lib/csrf";

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { userId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const reason =
    typeof body.reason === "string" && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 500)
      : null;

  if (!userId) return error("userId is required", 400);

  const [admin, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }),
  ]);

  if (!admin) return error("Admin account not found", 404);
  if (!target) return error("User not found", 404);

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        tier: "FREE",
        subscriptionStatus: "EXPIRED",
        trialEndsAt: now,
      },
      select: {
        id: true,
        tier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });

    await tx.adminAction.create({
      data: {
        adminUserId: admin.id,
        adminEmail: admin.email,
        action: "REVOKE_PREMIUM",
        targetUserId: userId,
        reason,
        details: "Revoked premium access",
      },
    });

    return user;
  });

  return json(updated);
}

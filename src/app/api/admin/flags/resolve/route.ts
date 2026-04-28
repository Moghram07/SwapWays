import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
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

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Invalid JSON", 400);

  const flagId = typeof body.flagId === "string" ? body.flagId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim().toUpperCase() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
  if (!flagId) return error("flagId is required", 400);
  if (!["DISMISS", "WARN", "REVOKE"].includes(action)) return error("Invalid action", 400);

  const admin = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true },
  });
  if (!admin) return error("Admin not found", 404);

  const flag = await prisma.accountFlag.findUnique({ where: { id: flagId } });
  if (!flag) return error("Flag not found", 404);

  await prisma.$transaction(async (tx) => {
    await tx.accountFlag.update({
      where: { id: flagId },
      data: {
        isResolved: true,
        resolvedBy: admin.email,
        resolvedAt: new Date(),
        adminNotes: notes || null,
      },
    });

    if (action === "REVOKE") {
      await tx.user.update({
        where: { id: flag.userId },
        data: {
          tier: "FREE",
          subscriptionStatus: "EXPIRED",
          trialEndsAt: new Date(),
        },
      });
    }

    if (action === "WARN") {
      await tx.notification.create({
        data: {
          userId: flag.userId,
          type: "ACCOUNT_WARNING",
          title: "Account Activity Notice",
          message:
            "We detected unusual login activity on your account. Sharing an account violates policy. Please secure your access.",
        },
      });
    }

    await tx.adminAction.create({
      data: {
        adminUserId: admin.id,
        adminEmail: admin.email,
        action: `RESOLVE_FLAG_${action}`,
        targetUserId: flag.userId,
        reason: notes || null,
        details: `Resolved ${flag.type} with action ${action}`,
      },
    });
  });

  return json({ ok: true });
}

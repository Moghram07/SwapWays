import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

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

  const [admin, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, email: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!admin) return error("Admin account not found", 404);
  if (!existing) return error("User not found", 404);

  await prisma.adminAction.create({
    data: {
      adminUserId: auth.userId,
      adminEmail: admin.email,
      action: "UPDATE_TIER",
      targetUserId: userId,
      details: `Legacy tier update ignored during free beta (requested tier: ${tier})`,
    },
  });

  return json({
    id: existing.id,
    mode: "FREE_BETA",
    applied: false,
    message: "Tier updates are disabled during free beta.",
  });
}

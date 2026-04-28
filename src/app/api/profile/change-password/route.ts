import { compare, hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSameOrigin } from "@/lib/csrf";

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return error("Please sign in.", 401);
  }

  const body = await request.json().catch(() => ({}));
  const currentPassword =
    typeof (body as { currentPassword?: unknown }).currentPassword === "string"
      ? (body as { currentPassword: string }).currentPassword
      : "";
  const newPassword =
    typeof (body as { newPassword?: unknown }).newPassword === "string"
      ? (body as { newPassword: string }).newPassword
      : "";

  if (!currentPassword || !newPassword) {
    return error("Current password and new password are required.", 422);
  }

  if (newPassword.length < 8) {
    return error("New password must be at least 8 characters.", 422);
  }

  if (newPassword === currentPassword) {
    return error("New password must be different from current password.", 422);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return error("User account not found.", 404);
  }

  const isCurrentValid = await compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return error("Current password is incorrect.", 403);
  }

  const passwordHash = await hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({
    data: { updated: true },
    error: null,
    message: "Password updated successfully.",
  });
}


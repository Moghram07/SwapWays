import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { session: null, user: null, isAdmin: false };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true, firstName: true, lastName: true, email: true },
  });
  return { session, user, isAdmin: !!user?.isAdmin };
}

export function unauthorizedResponse() {
  return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ data: null, error: "Forbidden", message: "Admin access required" }, { status: 403 });
}

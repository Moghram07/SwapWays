import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, message: true, isAdmin: true, createdAt: true, senderId: true },
      },
    },
  });

  if (!feedback) {
    return NextResponse.json({ data: null, error: "NotFound", message: "Feedback not found" }, { status: 404 });
  }
  return NextResponse.json({ data: feedback, error: null, message: null });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { message?: string; title?: string };
  const message = body.message?.trim();
  const title = body.title?.trim() || "Message from SwapWays";

  if (!message) {
    return NextResponse.json({ data: null, error: "Validation", message: "Message is required" }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) {
    return NextResponse.json({ data: null, error: "NotFound", message: "User not found" }, { status: 404 });
  }

  await createNotification({ userId: id, type: "ACCOUNT_WARNING", title, message });

  return NextResponse.json({ data: { sent: true }, error: null, message: `Message sent to ${user.email}.` });
}

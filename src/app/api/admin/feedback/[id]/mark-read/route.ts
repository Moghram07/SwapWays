import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { requireSameOrigin } from "@/lib/csrf";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  await prisma.feedback.update({
    where: { id },
    data: { hasUnreadByAdmin: false },
  });

  return NextResponse.json({ data: { ok: true }, error: null, message: null });
}

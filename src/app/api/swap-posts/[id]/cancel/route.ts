import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NON_CANCELLABLE_STATUSES = ["AGREED", "COMPLETED", "EXPIRED", "CANCELLED"];

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const post = await prisma.swapPost.findUnique({
    where: { id },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (NON_CANCELLABLE_STATUSES.includes(post.status)) {
    return NextResponse.json(
      { error: "Cannot cancel this post (already completed or cancelled)" },
      { status: 400 }
    );
  }

  const updated = await prisma.swapPost.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ data: updated });
}

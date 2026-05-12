import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/withTimeout";

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  try {
    await withTimeout(
      prisma.notification.deleteMany({
        where: { id, userId: session.user.id },
      }),
      3500,
      "notification delete"
    );
    return NextResponse.json({ data: null, error: null, message: "Deleted" });
  } catch {
    return NextResponse.json(
      { data: null, error: "ServiceUnavailable", message: "Could not delete notification" },
      { status: 200 }
    );
  }
}

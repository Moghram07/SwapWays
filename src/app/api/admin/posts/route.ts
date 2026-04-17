import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") || "swap").toLowerCase();

  try {
    if (type === "line") {
      const posts = await prisma.lineSwapPost.findMany({
        take: 75,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          lineNumber: true,
          month: true,
          year: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
      return json({ kind: "line" as const, posts });
    }

    const posts = await prisma.swapPost.findMany({
      take: 75,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        postType: true,
        createdAt: true,
        wantType: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        offeredTrips: {
          take: 3,
          select: { id: true, destination: true, departureDate: true },
        },
      },
    });
    return json({ kind: "swap" as const, posts });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to load posts", 500);
  }
}

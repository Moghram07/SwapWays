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

  let body: { kind?: string; id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const kind = body.kind === "line" ? "line" : "swap";
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const action = body.action === "cancel" ? "cancel" : null;
  if (!id || action !== "cancel") return error("id and action=cancel are required; kind is swap|line", 400);

  if (kind === "line") {
    await prisma.lineSwapPost.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  } else {
    await prisma.swapPost.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }

  return json({ ok: true });
}

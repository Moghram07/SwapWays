import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health — Check if the app and database are OK.
 * Use this to verify your Supabase (or other) database is connected.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        // Keep response sanitized in production to avoid leaking internals.
        error: "Service unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

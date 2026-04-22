import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    {
      data: null,
      error: "Deprecated",
      message: "Email verification is not used in Phase 1. Upload a schedule to verify your account.",
    },
    { status: 410 }
  );
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  return NextResponse.json({
    data: {
      trialReward: {
        granted: false,
        reason: "BETA_FREE_MODE",
      },
    },
    error: null,
    message: "Install recorded. All features are unlocked during free beta.",
  });
}

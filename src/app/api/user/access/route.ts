import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getUserAccess } from "@/utils/featureGates";
import { withTimeout } from "@/lib/withTimeout";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: "Unauthorized", message: "Please sign in" },
      { status: 401 }
    );
  }

  try {
    const access = await withTimeout(getUserAccess(session.user.id), 3500, "user access");
    return NextResponse.json({ data: access, error: null, message: null });
  } catch {
    const degradedAccess = {
      tier: "FREE" as const,
      isVerified: false,
      isTrialing: false,
      trialDaysRemaining: 0,
      freeConversationDailyLimit: 1,
      freeConversationStartsRemaining: 0,
      canPostLineSwap: false,
      canPostVacationSwap: false,
      canSeeExactMatch: false,
      canSeeFullNotes: false,
      canStartNewConversation: false,
      canViewConversationHistory: false,
      canUploadSchedule: false,
      postExpirationDays: 7,
      hasPriorityPlacement: false,
      hasAdvancedFilters: false,
    };
    return NextResponse.json(
      {
        data: degradedAccess,
        error: "ServiceUnavailable",
        message: "Access is temporarily degraded while the database reconnects.",
        meta: { degraded: true },
      },
      { status: 200 }
    );
  }
}

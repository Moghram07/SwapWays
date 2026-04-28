import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { grantTrialReward } from "@/services/subscription/trialRewards";
import { trackEventServer } from "@/lib/analytics/server";
import { requireSameOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  const reward = await grantTrialReward({
    userId: session.user.id,
    type: "INSTALL_APP",
    requestedDays: 10,
    metadata: { source: "dashboard_install_page" },
  });

  if (reward.granted) {
    await trackEventServer({
      eventName: "trial_extended_install",
      userId: session.user.id,
      path: "/dashboard/install",
      properties: {
        daysGranted: reward.daysGranted,
        trialEndsAt: reward.trialEndsAt.toISOString(),
        capped: reward.capped,
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    data: { trialReward: reward },
    error: null,
    message: reward.granted ? "Install reward granted" : "Install reward not granted",
  });
}

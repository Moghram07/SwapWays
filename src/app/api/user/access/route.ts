import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getUserAccess } from "@/utils/featureGates";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: "Unauthorized", message: "Please sign in" },
      { status: 401 }
    );
  }

  try {
    const access = await getUserAccess(session.user.id);
    return NextResponse.json({ data: access, error: null, message: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to resolve access." },
      { status: 500 }
    );
  }
}

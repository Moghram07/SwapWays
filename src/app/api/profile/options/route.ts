import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/withTimeout";
import { getAirlineConfig } from "@/config/airlines";

function normalizeSaudiaAircraftFamily(code: string): "A320" | "A321" | "A330" | "B777" | "B787" | null {
  const c = code.toUpperCase();
  if (c.startsWith("32") || c.startsWith("A320")) return "A320";
  if (c === "323" || c.startsWith("A321")) return "A321";
  if (c.startsWith("33") || c.startsWith("A330")) return "A330";
  if (c.startsWith("77") || c.startsWith("B777")) return "B777";
  if (c.startsWith("78") || c.startsWith("B787")) return "B787";
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  try {
    const user = await withTimeout(
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          airlineId: true,
          airline: { select: { code: true } },
        },
      }),
      1200,
      "profile options user query"
    );
    if (!user) {
      return NextResponse.json({ data: null, error: "Not found", message: "User not found" }, { status: 404 });
    }

    const [ranks, bases, aircraftTypes] = await withTimeout(
      Promise.all([
        prisma.rank.findMany({
          where: { airlineId: user.airlineId },
          orderBy: { sortOrder: "asc" },
          select: { id: true, code: true, name: true },
        }),
        prisma.base.findMany({
          where: { airlineId: user.airlineId },
          orderBy: { airportCode: "asc" },
          select: { id: true, name: true, airportCode: true },
        }),
        prisma.aircraftType.findMany({
          where: { airlineId: user.airlineId },
          orderBy: { code: "asc" },
          select: { id: true, code: true, name: true },
        }),
      ]),
      1400,
      "profile options metadata query"
    );

    // Signup-eligible bases are per-airline (Saudia is limited to JED/RUH; others use all bases).
    const allowedBaseCodes = getAirlineConfig(user.airline.code)?.registrationBaseCodes;
    const selectableBases = allowedBaseCodes
      ? bases.filter((b) => allowedBaseCodes.includes(b.airportCode))
      : bases;

    const fleetAircraftTypes =
      user.airline.code === "SV"
        ? (() => {
            const families: Array<"A320" | "A321" | "A330" | "B777" | "B787"> = ["A320", "A321", "A330", "B777", "B787"];
            const byFamily = new Map<string, { id: string; code: string; name: string }>();

            for (const family of families) {
              const candidates = aircraftTypes.filter((at) => normalizeSaudiaAircraftFamily(at.code) === family);
              if (candidates.length === 0) continue;
              const preferred = candidates.find((at) => at.code.toUpperCase() === family) ?? candidates[0];
              const familyName = family.startsWith("A") ? `Airbus ${family}` : `Boeing ${family}`;
              byFamily.set(family, { id: preferred.id, code: family, name: familyName });
            }

            return families.map((family) => byFamily.get(family)).filter(Boolean) as { id: string; code: string; name: string }[];
          })()
        : aircraftTypes;

    return NextResponse.json({
      data: {
        ranks,
        bases: selectableBases,
        aircraftTypes: fleetAircraftTypes,
      },
      error: null,
      message: null,
    });
  } catch (error) {
    console.error("[api/profile/options] degraded response due to transient DB failure", error);
    return NextResponse.json(
      {
        data: { ranks: [], bases: [], aircraftTypes: [] },
        error: "ServiceUnavailable",
        message: "Profile options are temporarily degraded while the database reconnects.",
      },
      { status: 200 }
    );
  }
}

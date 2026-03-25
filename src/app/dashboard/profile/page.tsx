import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/repositories/userRepository";
import { getRanksByAirlineId, getBasesByAirlineId, getAircraftTypesByAirlineId } from "@/repositories/airlineRepository";
import { ProfileForm } from "@/components/profile/ProfileForm";

function normalizeSaudiaAircraftFamily(code: string): "A320" | "A321" | "A330" | "B777" | "B787" | null {
  const c = code.toUpperCase();
  if (c.startsWith("32") || c.startsWith("A320")) return "A320";
  if (c === "323" || c.startsWith("A321")) return "A321";
  if (c.startsWith("33") || c.startsWith("A330")) return "A330";
  if (c.startsWith("77") || c.startsWith("B777")) return "B777";
  if (c.startsWith("78") || c.startsWith("B787")) return "B787";
  return null;
}

function isSaudiaFamily(
  value: "A320" | "A321" | "A330" | "B777" | "B787" | null
): value is "A320" | "A321" | "A330" | "B777" | "B787" {
  return value !== null;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id ? await findUserById(session.user.id) : null;
  if (!user) return null;
  const [ranks, bases, aircraftTypes] = await Promise.all([
    getRanksByAirlineId(user.airlineId),
    getBasesByAirlineId(user.airlineId),
    getAircraftTypesByAirlineId(user.airlineId),
  ]);

  const fleetAircraftTypes =
    user.airline.code === "SV"
      ? (() => {
          const families: Array<"A320" | "A321" | "A330" | "B777" | "B787"> = [
            "A320",
            "A321",
            "A330",
            "B777",
            "B787",
          ];
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
      : aircraftTypes.map((at) => ({ id: at.id, code: at.code, name: at.name }));

  const userQualificationFamilyCodes =
    user.airline.code === "SV"
      ? new Set(
          user.qualifications
            .map((q) => normalizeSaudiaAircraftFamily(q.aircraftType.code))
            .filter(isSaudiaFamily)
        )
      : null;

  const selectedQualificationIds =
    user.airline.code === "SV" && userQualificationFamilyCodes
      ? fleetAircraftTypes
          .filter((at) => {
            const family = normalizeSaudiaAircraftFamily(at.code);
            return family ? userQualificationFamilyCodes.has(family) : false;
          })
          .map((at) => at.id)
      : user.qualifications.map((q) => q.aircraftType.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-2 text-slate-600">Manage your crew details and aircraft qualifications.</p>
      </div>
      <div className="max-w-2xl">
        <ProfileForm
          user={{
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            crewId: user.crewId,
            phone: user.phone,
            rankId: user.rankId,
            baseId: user.baseId,
            hasUsVisa: user.hasUsVisa,
            hasChinaVisa: user.hasChinaVisa,
            qualificationIds: selectedQualificationIds,
          }}
          ranks={ranks.map((r) => ({ id: r.id, code: r.code, name: r.name }))}
          bases={bases.map((b) => ({ id: b.id, name: b.name, airportCode: b.airportCode }))}
          aircraftTypes={fleetAircraftTypes}
        />
      </div>
    </div>
  );
}

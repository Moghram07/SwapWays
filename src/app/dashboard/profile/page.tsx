import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { withTimeout } from "@/lib/withTimeout";
import { prisma } from "@/lib/prisma";
import { getDashboardLocale } from "../_lib/locale";
import { getTranslator } from "@/i18n/getTranslator";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/profile");
  }
  const locale = await getDashboardLocale();
  const t = getTranslator(locale);
  let user = null;
  try {
    user = await withTimeout(
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          crewId: true,
          phone: true,
          rankId: true,
          baseId: true,
          hasUsVisa: true,
          hasChinaVisa: true,
          airlineId: true,
          airline: { select: { code: true } },
          rank: { select: { id: true, code: true, name: true } },
          base: { select: { id: true, name: true, airportCode: true } },
          qualifications: {
            select: {
              aircraftType: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  airlineId: true,
                  scheduleCode: true,
                },
              },
            },
          },
        },
      }),
      1200,
      "dashboard profile user query"
    );
  } catch (error) {
    console.error("[dashboard/profile] user query degraded", error);
  }
  const fallbackNameParts = (session.user.name ?? "").trim().split(/\s+/).filter(Boolean);
  const fallbackFirstName = fallbackNameParts[0] ?? t("dashboard.crewFallback");
  const fallbackLastName = fallbackNameParts.slice(1).join(" ") || "Member";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-content">{t("dashboard.profileTitle")}</h1>
        <p className="mt-2 text-muted">{t("dashboard.profileSubtitle")}</p>
      </div>
      <div className="max-w-2xl">
        <ProfileForm
          user={{
            id: user?.id ?? session.user.id,
            firstName: user?.firstName ?? fallbackFirstName,
            lastName: user?.lastName ?? fallbackLastName,
            email: user?.email ?? session.user.email ?? "",
            crewId: user?.crewId ?? "",
            phone: user?.phone ?? null,
            rankId: user?.rankId ?? "",
            baseId: user?.baseId ?? "",
            hasUsVisa: user?.hasUsVisa ?? false,
            hasChinaVisa: user?.hasChinaVisa ?? false,
            qualificationIds: user?.qualifications.map((q) => q.aircraftType.id) ?? [],
          }}
          ranks={[]}
          bases={[]}
          aircraftTypes={[]}
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { withTimeout } from "@/lib/withTimeout";
import { prisma } from "@/lib/prisma";
import { AccountSignOutButton } from "@/components/account/AccountSignOutButton";
import { getDashboardLocale } from "../_lib/locale";
import { getTranslator } from "@/i18n/getTranslator";

function Row({ href, label, note }: { href: string; label: string; note?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="leading-snug">{label}</span>
        {note ? (
          <span className="text-xs font-normal leading-relaxed text-slate-500">{note}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-slate-400" aria-hidden>
        ›
      </span>
    </Link>
  );
}

export default async function AccountPage() {
  const locale = await getDashboardLocale();
  const t = getTranslator(locale);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/account");

  const user = await withTimeout(
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        isVerified: true,
        rank: { select: { name: true } },
        base: { select: { name: true } },
        _count: { select: { schedules: true } },
      },
    }),
    3000,
    "account page profile header"
  ).catch(() => null);

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    session.user.name?.trim() ||
    session.user.email?.split("@")[0] ||
    "Crew";
  const rankLabel = user?.rank?.name?.trim();
  const baseLabel = user?.base?.name ? `${user.base.name} Base` : null;
  const details = [fullName, rankLabel, baseLabel].filter(Boolean).join(" · ");
  const isVerifiedWithSchedule = Boolean(user?.isVerified && (user?._count?.schedules ?? 0) > 0);

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-2 px-1 py-1">
        <h1 className="text-lg font-semibold text-slate-900">{details}</h1>
        {isVerifiedWithSchedule ? (
          <CheckCircle2 className="h-4 w-4 text-[#2668B0]" aria-label={t("dashboard.verifiedAccount")} />
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("dashboard.accountSection")}</p>
        <Row href="/dashboard/profile" label={t("dashboard.editProfile")} />
        <Row
          href="/dashboard/schedule"
          label={t("dashboard.lineSchedule")}
          note={
            (user?._count?.schedules ?? 0) === 0
              ? t("dashboard.uploadPdfPostFaster")
              : t("dashboard.uploadPdfLineSchedule")
          }
        />
        <Row href="/dashboard/my-trades" label={t("dashboard.myFlights")} />
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("dashboard.activitySection")}</p>
        <Row href="/dashboard/notifications" label={t("dashboard.notificationHistory")} />
        <Row href="/dashboard/feedback" label={t("dashboard.helpAndFeedback")} />
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("dashboard.appSection")}</p>
        <Row href="/dashboard/install" label={t("dashboard.installSwapways")} />
      </section>

      <section>
        <AccountSignOutButton />
      </section>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localizePath, type Locale } from "@/i18n/config";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`${localizePath("/login", locale)}?callbackUrl=/dashboard`);
  }
  const isAdmin = !!(session.user as { isAdmin?: boolean }).isAdmin;
  return <DashboardShell isAdmin={isAdmin} locale={locale}>{children}</DashboardShell>;
}

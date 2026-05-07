import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";

export async function getDashboardLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
}


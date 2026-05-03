import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localizePath } from "@/i18n/config";

type Props = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordRedirectPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const path = localizePath("/reset-password", locale);
  const q = await searchParams;
  const raw = q.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const url = token ? `${path}?token=${encodeURIComponent(token)}` : path;
  redirect(url);
}

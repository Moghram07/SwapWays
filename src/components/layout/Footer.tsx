"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, getLocaleFromPathname, localizePath } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

export function Footer() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname ?? "") ?? DEFAULT_LOCALE;
  const t = getTranslator(locale);

  return (
    <footer className="bg-[#1a365d] py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link href={localizePath("/", locale)} className="flex items-center gap-2">
            <img
              src="/images/swapways-logo.png"
              alt=""
              width={32}
              height={32}
              className="object-contain brightness-0 invert"
            />
            <span className="text-lg font-semibold text-white">{t("footer.brand")}</span>
          </Link>
          <div className="flex gap-8 text-sm text-white/60">
            <Link href={localizePath("/privacy", locale)} className="transition-colors hover:text-white/90">
              {t("footer.privacy")}
            </Link>
            <Link href={localizePath("/terms", locale)} className="transition-colors hover:text-white/90">
              {t("footer.terms")}
            </Link>
            <Link href={localizePath("/support", locale)} className="transition-colors hover:text-white/90">
              {t("footer.support")}
            </Link>
            <Link href={localizePath("/contact", locale)} className="transition-colors hover:text-white/90">
              {t("footer.contact")}
            </Link>
          </div>
          <p className="text-sm text-white/50">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}

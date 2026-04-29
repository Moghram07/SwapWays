"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

const LOGO_BLUE = "#045FA6";
const LOGO_GREEN = "#299B4F";

type Variant = "1" | "2" | "3" | "4" | "5";

function BrandIcon({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <img
      src="/images/swapways-logo.png"
      alt=""
      width={size}
      height={size}
      className={className}
    />
  );
}

function BrandText() {
  return (
    <span className="logo-wordmark font-bold">
      <span style={{ color: LOGO_BLUE }}>Swap</span>
      <span style={{ color: LOGO_GREEN }}> Ways</span>
    </span>
  );
}

function AuthLinks({ linkGreenHoverBlue, locale }: { linkGreenHoverBlue?: boolean; locale: Locale }) {
  const { data: session, status } = useSession();
  const t = getTranslator(locale);
  const linkClass = "text-sm font-medium transition-colors hover:underline";

  if (status === "loading") return <span className="text-sm opacity-70">…</span>;
  if (session) {
    return (
      <div className={linkGreenHoverBlue ? "nav-link flex items-center gap-4" : "flex items-center gap-4"}>
        <Link href="/dashboard" className={linkClass}>Dashboard</Link>
        <span className="text-sm">{(session.user?.name ?? session.user?.email) as string}</span>
        <button type="button" onClick={() => signOut()} className={`${linkClass} cursor-pointer border-none bg-transparent`}>Sign out</button>
      </div>
    );
  }
  return (
    <div className={linkGreenHoverBlue ? "nav-link flex items-center gap-4" : "flex items-center gap-4"}>
      <Link href={localizePath("/login", locale)} className={linkClass}>{t("nav.logIn")}</Link>
      <Link href={localizePath("/register", locale)} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition opacity-90 hover:opacity-100" style={{ backgroundColor: LOGO_BLUE }}>{t("nav.signUp")}</Link>
    </div>
  );
}

export function LandingTopBar({
  variant,
  locale = DEFAULT_LOCALE,
}: {
  variant: Variant;
  locale?: Locale;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = getTranslator(locale);
  const isArabic = locale === "ar";
  const isV1 = variant === "1";
  const sharedLinks = <AuthLinks linkGreenHoverBlue={isV1} locale={locale} />;

  if (variant === "1") {
    return (
      <header className="landing-nav-v1 sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href={localizePath("/", locale)} className="flex items-center gap-2">
            <BrandIcon className="object-contain" size={36} />
            <span className="logo-wordmark text-lg font-bold text-slate-900"><span style={{ color: LOGO_BLUE }}>Swap</span> <span style={{ color: LOGO_GREEN }}>Ways</span></span>
          </Link>
          {sharedLinks}
        </div>
      </header>
    );
  }

  if (variant === "2") {
    return (
      <header className="sticky top-0 z-50 bg-slate-900 text-white [&_a]:text-white [&_a]:hover:opacity-90 [&_button]:text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href={localizePath("/", locale)} className="flex items-center gap-2">
            <BrandIcon className="object-contain opacity-95" size={36} />
            <span className="logo-wordmark text-lg font-bold" style={{ color: "#7dd3fc" }}>Swap</span>
            <span className="logo-wordmark text-lg font-bold" style={{ color: "#86efac" }}>Ways</span>
          </Link>
          {sharedLinks}
        </div>
      </header>
    );
  }

  if (variant === "3") {
    return (
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-5 md:px-8">
          <Link href="/3" className="flex items-center gap-2">
            <BrandIcon className="object-contain" size={32} />
            <span className="logo-wordmark text-base font-semibold tracking-tight">
              <span style={{ color: LOGO_BLUE }}>Swap</span>{" "}
              <span style={{ color: LOGO_GREEN }}>Ways</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/3#how" className="text-slate-600 transition hover:text-slate-900">How it works</Link>
            <Link href="/login" className="text-slate-600 transition hover:text-slate-900">Log in</Link>
            <Link href="/register" className="rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-95" style={{ backgroundColor: LOGO_BLUE }}>Get Started</Link>
          </nav>
        </div>
      </header>
    );
  }

  if (variant === "4") {
    const landingLinks = [
      { label: t("nav.howItWorks"), href: localizePath("/", locale) + "#how-it-works" },
      { label: t("nav.features"), href: localizePath("/", locale) + "#features" },
      { label: t("nav.getStarted"), href: localizePath("/", locale) + "#get-started" },
    ];
    return (
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href={localizePath("/", locale)} className="flex items-center gap-2">
            <BrandIcon className="object-contain" size={36} />
            <span className="logo-wordmark text-lg font-bold">
              <span style={{ color: LOGO_BLUE }}>Swap</span>
              <span style={{ color: LOGO_GREEN }}> Ways</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
            {landingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium text-[#333] transition hover:text-[#045FA6] ${isArabic ? "font-arabic-ui" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href={localizePath("/login", locale)} className="text-sm font-medium text-[#333] transition hover:text-[#045FA6]">{t("nav.logIn")}</Link>
            <Link href={localizePath("/register", locale)}>
              <Button size="sm" className="rounded-lg" style={{ backgroundColor: LOGO_BLUE }}>{t("nav.getStarted")}</Button>
            </Link>
            <LanguageToggle className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700" />
          </div>
          <button
            type="button"
            className="text-[#333] md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden">
            <div className="space-y-1 pt-3">
              {landingLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block py-2 text-sm font-medium text-[#333] ${isArabic ? "font-arabic-ui" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex gap-3 pt-3">
              <Link href={localizePath("/login", locale)} className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full">{t("nav.logIn")}</Button>
              </Link>
              <Link href={localizePath("/register", locale)} className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full" style={{ backgroundColor: LOGO_BLUE }}>{t("nav.getStarted")}</Button>
              </Link>
            </div>
            <div className="pt-2">
              <LanguageToggle className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700" />
            </div>
          </div>
        )}
      </header>
    );
  }

  if (variant === "5") {
    return (
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-5 md:px-8">
          <Link href="/5" className="flex items-center gap-2">
            <BrandIcon className="object-contain grayscale" size={32} />
            <span className="logo-wordmark text-base font-semibold tracking-tight text-slate-900">Swap Ways</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/5#how" className="text-slate-600 transition hover:text-slate-900">How it works</Link>
            <Link href="/login" className="text-slate-600 transition hover:text-slate-900">Log in</Link>
            <Link href="/register" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">Get Started</Link>
          </nav>
        </div>
      </header>
    );
  }

  return null;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, LayoutDashboard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { DEFAULT_LOCALE, getLocaleFromPathname, localizePath } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

const LOGO_BLUE = "#045FA6";
const LOGO_GREEN = "#299B4F";

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname ?? "/") ?? DEFAULT_LOCALE;
  const t = getTranslator(locale);
  const { data: session, status } = useSession();
  const isDashboard = pathname?.startsWith("/dashboard");
  const navLinks = [
    { label: t("nav.howItWorks"), href: `${localizePath("/", locale)}#how-it-works` },
    { label: t("nav.features"), href: `${localizePath("/", locale)}#features` },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href={isDashboard ? "/dashboard" : localizePath("/", locale)} className="flex items-center gap-2">
            <img
              src="/images/swapways-logo.png"
              alt=""
              width={36}
              height={36}
              className="object-contain"
            />
            <span className="text-lg font-bold">
              <span style={{ color: LOGO_BLUE }}>Swap</span>
              <span style={{ color: LOGO_GREEN }}> Ways</span>
            </span>
          </Link>
          {isDashboard && (
            <>
              <span className="hidden text-slate-400 sm:inline">/</span>
              <span className="hidden items-center gap-1.5 text-slate-600 sm:flex">
                <LayoutDashboard className="h-4 w-4" />
                Crew Dashboard
              </span>
              <FileText className="h-4 w-4 text-slate-400 sm:hidden" aria-hidden />
            </>
          )}
        </div>

        {!isDashboard && (
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="hidden items-center gap-3 md:flex">
          {status === "loading" ? (
            <span className="text-sm text-slate-500">…</span>
          ) : session ? (
            <>
              {isDashboard ? (
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: LOGO_BLUE }}
                  >
                    {getInitials(session.user?.name ?? null, session.user?.email ?? null)}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {session.user?.name ?? session.user?.email}
                  </span>
                </div>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                  >
                    Dashboard
                  </Link>
                  <span className="text-sm text-slate-600">
                    {session.user?.name ?? session.user?.email}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => signOut()}>
                    Sign out
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Link href={localizePath("/login", locale)}>
                <Button variant="ghost" size="sm">
                  {t("nav.logIn")}
                </Button>
              </Link>
              <Link href={localizePath("/register", locale)}>
                <Button size="sm" style={{ backgroundColor: LOGO_BLUE }} className="hover:opacity-90">
                  {t("nav.getStarted")}
                </Button>
              </Link>
            </>
          )}
          {!isDashboard && (
            <LanguageToggle className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700" />
          )}
        </div>

        <button
          type="button"
          className="text-slate-700 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pb-4 md:hidden">
          {!isDashboard && (
            <div className="space-y-3 pt-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm font-medium text-slate-600"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            {status === "loading" ? null : session ? (
              <>
                <Link href="/dashboard" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { signOut(); setMobileOpen(false); }}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href={localizePath("/login", locale)} className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    {t("nav.logIn")}
                  </Button>
                </Link>
                <Link href={localizePath("/register", locale)} className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full" style={{ backgroundColor: LOGO_BLUE }}>
                    {t("nav.getStarted")}
                  </Button>
                </Link>
              </>
            )}
          </div>
          {!isDashboard && (
            <div className="pt-2">
              <LanguageToggle className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700" />
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

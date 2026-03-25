"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const LOGO_BLUE = "#045FA6";
const LOGO_GREEN = "#299B4F";

type Variant = "1" | "2" | "3" | "4" | "5";

function BrandIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/images/swapways-logo.png"
      alt=""
      width={36}
      height={36}
      className={className}
      style={{ width: "auto", height: "auto" }}
    />
  );
}

function BrandText() {
  return (
    <span className="font-bold">
      <span style={{ color: LOGO_BLUE }}>Swap</span>
      <span style={{ color: LOGO_GREEN }}> Ways</span>
    </span>
  );
}

function AuthLinks({ linkGreenHoverBlue }: { linkGreenHoverBlue?: boolean }) {
  const { data: session, status } = useSession();
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
      <Link href="/login" className={linkClass}>Log in</Link>
      <Link href="/register" className="rounded-lg px-4 py-2 text-sm font-medium text-white transition opacity-90 hover:opacity-100" style={{ backgroundColor: LOGO_BLUE }}>Sign up</Link>
    </div>
  );
}

export function LandingTopBar({ variant }: { variant: Variant }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isV1 = variant === "1";
  const sharedLinks = <AuthLinks linkGreenHoverBlue={isV1} />;

  if (variant === "1") {
    return (
      <header className="landing-nav-v1 sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandIcon className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold text-slate-900"><span style={{ color: LOGO_BLUE }}>Swap</span> <span style={{ color: LOGO_GREEN }}>Ways</span></span>
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
          <Link href="/" className="flex items-center gap-2">
            <BrandIcon className="h-9 w-9 object-contain opacity-95" />
            <span className="text-lg font-bold" style={{ color: "#7dd3fc" }}>Swap</span>
            <span className="text-lg font-bold" style={{ color: "#86efac" }}>Ways</span>
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
            <BrandIcon className="h-8 w-8 object-contain" />
            <span className="text-base font-semibold tracking-tight">
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
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "For Airlines", href: "/#for-airlines" },
    ];
    return (
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandIcon className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold">
              <span style={{ color: LOGO_BLUE }}>Swap</span>
              <span style={{ color: LOGO_GREEN }}> Ways</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
            {landingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#333] transition hover:text-[#045FA6]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-[#333] transition hover:text-[#045FA6]">Log In</Link>
            <Link href="/register">
              <Button size="sm" className="rounded-lg" style={{ backgroundColor: LOGO_BLUE }}>Get Started</Button>
            </Link>
          </div>
          <button
            type="button"
            className="text-[#333] md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
                  className="block py-2 text-sm font-medium text-[#333]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex gap-3 pt-3">
              <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full">Log In</Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full" style={{ backgroundColor: LOGO_BLUE }}>Get Started</Button>
              </Link>
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
            <BrandIcon className="h-8 w-8 object-contain grayscale" />
            <span className="text-base font-semibold tracking-tight text-slate-900">Swap Ways</span>
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

"use client";

import dynamic from "next/dynamic";
import { Hero } from "./Hero";
import { SupportedAirlines } from "./SupportedAirlines";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

/** Below-the-fold: load after first paint to cut initial JS (framer-motion chunks). */
const HowItWorks = dynamic(() => import("./HowItWorks").then((m) => ({ default: m.HowItWorks })), {
  loading: () => (
    <section className="min-h-[240px] border-t border-slate-200 bg-slate-50" aria-hidden>
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="mx-auto h-8 max-w-md animate-pulse rounded bg-slate-200" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    </section>
  ),
  ssr: false,
});

const CTA = dynamic(() => import("./CTA").then((m) => ({ default: m.CTA })), {
  loading: () => <div className="h-48 border-t border-slate-200 bg-[#0C3E7C]/5" aria-hidden />,
  ssr: false,
});

export function LandingContentV4({
  locale = DEFAULT_LOCALE,
}: {
  locale?: Locale;
}) {
  const t = getTranslator(locale);
  return (
    <>
      <Hero locale={locale} />

      <SupportedAirlines locale={locale} />

      <HowItWorks locale={locale} />

      {/* Features - nav anchor */}
      <section id="features" className="scroll-mt-20 border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("landing.featuresTitle")}</h2>
          <p className="mt-3 text-slate-600">
            {t("landing.featuresBody")}
          </p>
        </div>
      </section>

      <CTA locale={locale} />
    </>
  );
}

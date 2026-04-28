"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

export function CTA({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = getTranslator(locale);
  return (
    <section id="get-started" className="relative overflow-hidden bg-hero py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl"
        >
          <h2 className="mb-5 text-3xl font-extrabold text-white sm:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-white/70">
            {t("cta.body")}
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button variant="hero" size="lg" className="rounded-lg px-10 py-6 text-base" asChild>
              <Link href={localizePath("/register", locale)}>
                {t("cta.createFreeAccount")} <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="rounded-lg px-10 py-6 text-base" asChild>
              <Link href="/support">{t("cta.readDetails")}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

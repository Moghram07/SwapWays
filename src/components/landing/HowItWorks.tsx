"use client";

import { motion } from "framer-motion";
import { UserCircle, ArrowLeftRight, MessagesSquare } from "lucide-react";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

const PRIMARY = "#045FA6";
const GREEN = "#299B4F";

export function HowItWorks({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = getTranslator(locale);
  const steps = [
    {
      icon: UserCircle,
      title: t("howItWorks.step1Title"),
      description: t("howItWorks.step1Description"),
      color: PRIMARY,
    },
    {
      icon: ArrowLeftRight,
      title: t("howItWorks.step2Title"),
      description: t("howItWorks.step2Description"),
      color: GREEN,
    },
    {
      icon: MessagesSquare,
      title: t("howItWorks.step3Title"),
      description: t("howItWorks.step3Description"),
      color: PRIMARY,
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 bg-slate-50/50 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t("howItWorks.headingStart")}<span className="text-gradient">{t("howItWorks.headingAccent")}</span>
          </h2>
          <p className="mx-auto max-w-md text-lg text-slate-600">
            {t("howItWorks.subheading")}
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                className="relative rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span
                  className="absolute right-4 top-4 text-5xl font-extrabold tabular-nums text-gray-400"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div
                  className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${step.color}18` }}
                >
                  <Icon
                    className="shrink-0"
                    size={28}
                    strokeWidth={2}
                    style={{ color: step.color }}
                  />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

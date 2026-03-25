"use client";

import { motion } from "framer-motion";
import { UserCircle, Upload, CheckCircle2 } from "lucide-react";

const PRIMARY = "#045FA6";
const GREEN = "#299B4F";

const steps = [
  {
    icon: UserCircle,
    title: "Create profile",
    description: "Set your rank, base, and aircraft qualifications so we only show relevant matches.",
    color: PRIMARY,
  },
  {
    icon: Upload,
    title: "Post trade",
    description: "Add the trip you want to give away and what you want in return.",
    color: GREEN,
  },
  {
    icon: CheckCircle2,
    title: "Get matched",
    description: "We find compatible crew and show you the best matches.",
    color: PRIMARY,
  },
];

export function HowItWorks() {
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
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="mx-auto max-w-md text-lg text-slate-600">
            Three simple steps to take control of your roster.
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
                  className="absolute right-4 top-4 text-5xl font-extrabold tabular-nums text-slate-100"
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

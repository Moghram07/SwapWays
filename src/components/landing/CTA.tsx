"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section id="for-airlines" className="relative overflow-hidden bg-hero py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl"
        >
          <h2 className="mb-5 text-3xl font-extrabold text-white sm:text-4xl">
            Ready to Take Control of Your Roster?
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-white/70">
            Join thousands of crew members already using Swap Ways to build the schedule they want. Free for crew, seamless for airlines.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button variant="hero" size="lg" className="rounded-lg px-10 py-6 text-base" asChild>
              <Link href="/register">
                Create Free Account <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="rounded-lg px-10 py-6 text-base" asChild>
              <Link href="#for-airlines">Airline Partnerships</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

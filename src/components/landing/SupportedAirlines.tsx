import Image from "next/image";
import { getAllAirlineConfigs } from "@/config/airlines";
import { getAirlineBrand } from "@/config/airlines/branding";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

/** Trust strip under the hero: every carrier whose crew can sign up today. */
export function SupportedAirlines({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = getTranslator(locale);
  const airlines = getAllAirlineConfigs();

  return (
    <section className="border-t border-slate-200 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("landing.supportedAirlines")}
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {airlines.map((airline) => {
            const brand = getAirlineBrand(airline);
            return (
              <li
                key={airline.code}
                className="flex h-28 items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
              >
                {brand.logoSrc ? (
                  // `fill` + object-contain so wordmarks and stacked lockups both sit correctly.
                  <span className="relative h-full w-full">
                    <Image
                      src={brand.logoSrc}
                      alt={airline.name}
                      fill
                      sizes="(max-width: 640px) 45vw, 22vw"
                      className="object-contain"
                    />
                  </span>
                ) : (
                  <span
                    className="text-center text-xl font-extrabold tracking-tight sm:text-2xl"
                    style={{ color: brand.color }}
                  >
                    {brand.wordmark}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

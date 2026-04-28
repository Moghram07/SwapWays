import { notFound } from "next/navigation";
import { LandingTopBar } from "@/components/landing/LandingTopBar";
import { LandingContentV4 } from "@/components/landing/LandingContentV4";
import { getDirection, isLocale } from "@/i18n/config";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedHomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="min-h-screen bg-[#f8f8f8]" lang={locale} dir={getDirection(locale)}>
      <LandingTopBar variant="4" locale={locale} />
      <main>
        <LandingContentV4 locale={locale} />
      </main>
    </div>
  );
}

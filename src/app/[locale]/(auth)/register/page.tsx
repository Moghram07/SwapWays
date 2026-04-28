import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getDirection, isLocale, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedRegisterPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale as Locale);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12" lang={locale} dir={getDirection(locale)}>
      <Card className="w-full max-w-lg border-slate-200 shadow-md">
        <CardHeader className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("auth.registerTitle")}</h1>
          <p className="text-sm text-slate-600">{t("auth.registerSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <RegisterForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}

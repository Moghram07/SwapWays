import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getDirection, isLocale, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ResetPasswordPage({ params }: Props) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const t = getTranslator(locale);

  return (
    <div
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12"
      lang={locale}
      dir={getDirection(locale)}
    >
      <Card className="w-full max-w-md border-slate-200 shadow-md">
        <CardHeader className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("auth.resetPasswordTitle")}</h1>
          <p className="text-sm text-slate-600">{t("auth.resetPasswordSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-slate-600">{t("auth.loading")}</p>}>
            <ResetPasswordForm locale={locale} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

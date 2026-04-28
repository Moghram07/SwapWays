import { notFound } from "next/navigation";
import Link from "next/link";
import TermsPage from "@/app/terms/page";
import { PageViewTracker } from "@/components/site/PageViewTracker";
import { getDirection, isLocale } from "@/i18n/config";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedTermsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  if (locale === "en") {
    return (
      <div lang={locale} dir={getDirection(locale)}>
        <TermsPage />
      </div>
    );
  }

  return (
    <div lang={locale} dir={getDirection(locale)}>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <PageViewTracker eventName="terms_page_viewed" path="/ar/terms" />
        <h1 className="text-3xl font-bold text-white">شروط الاستخدام</h1>
        <p className="mt-2 text-sm text-slate-300">تاريخ السريان: 21 أبريل 2026</p>

        <div className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">الأهلية واستخدام الحساب</h2>
            <p>
              أنت مسؤول عن دقة معلومات الحساب والمحافظة على أمان الوصول إليه. وقد يتطلب استخدام بعض الميزات الأساسية
              التحقق من بريد شركة الطيران.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">الاستخدام المقبول</h2>
            <p>
              يُمنع إساءة استخدام المنصة، أو إرسال رسائل مزعجة، أو انتحال هوية أفراد الطاقم، أو محاولة الاحتيال،
              أو تعطيل تشغيل الخدمة بأي شكل.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">مسؤولية البيانات والنشر</h2>
            <p>
              تتحمل مسؤولية دقة الجداول وتفاصيل طلبات التبديل والرسائل التي تنشرها عبر المنصة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">توفر الخدمة والتحديثات</h2>
            <p>
              قد نقوم بتحديث الميزات والأسعار والسياسات مع تطور المنتج، ونسعى إلى توضيح أي تغييرات جوهرية للمستخدمين
              بشكل واضح.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">الإيقاف أو إنهاء الحساب</h2>
            <p>
              قد يتم تقييد الحساب أو إيقافه في حالات إساءة الاستخدام أو مخالفة السياسات أو أي سلوك يضر سلامة
              المستخدمين أو موثوقية المنصة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">الاستفسار حول هذه الشروط</h2>
            <p>
              لأي استفسار أو طلب توضيح، تواصل معنا عبر{" "}
              <Link href="/ar/contact" className="text-[#045FA6] hover:underline">
                صفحة التواصل
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

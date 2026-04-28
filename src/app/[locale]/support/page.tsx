import { notFound } from "next/navigation";
import Link from "next/link";
import SupportPage from "@/app/support/page";
import { PageViewTracker } from "@/components/site/PageViewTracker";
import { getDirection, isLocale } from "@/i18n/config";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedSupportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  if (locale === "en") {
    return (
      <div lang={locale} dir={getDirection(locale)}>
        <SupportPage />
      </div>
    );
  }

  return (
    <div lang={locale} dir={getDirection(locale)}>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <PageViewTracker eventName="support_page_viewed" path="/ar/support" />
        <h1 className="text-3xl font-bold text-white">الدعم</h1>
        <p className="mt-2 text-sm text-slate-300">آخر تحديث: 21 أبريل 2026</p>
        <p className="mt-4 text-slate-200">
          هل تحتاج إلى مساعدة في التسجيل أو التحقق أو رفع الجدول أو إدارة الفترة التجريبية؟ ابدأ من هنا، ثم تواصل
          معنا إذا احتجت دعمًا إضافيًا.
        </p>

        <section className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">الأسئلة السريعة</h2>
          <div>
            <h3 className="font-semibold text-slate-900">كيف أتحقق من حسابي؟</h3>
            <p className="text-slate-700">
              يتم التحقق من الحساب بعد نجاح رفع الجدول. وإذا فشل تحليل الملف، استخدم نموذج التواصل مع وصف مختصر
              للمشكلة.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">لماذا فشل رفع الجدول؟</h3>
            <p className="text-slate-700">
              تأكد من أن الملف واضح وكامل. وإذا استمرت المشكلة، أرسلها عبر صفحة التواصل لنعمل على توسيع تغطية التحليل.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">كيف تعمل زيادة أيام التجربة؟</h3>
            <p className="text-slate-700">
              تبدأ بـ10 أيام مجانًا. التسجيل عبر الإحالة يبدأ بـ20 يومًا، وتثبيت التطبيق يضيف +10 مرة واحدة، ورفع
              الجدول يضيف +10 مرة واحدة، وكل إحالة ناجحة تضيف +10 (حتى 3 إحالات)، بحد أقصى 60 يومًا.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">تواصل مع الدعم</h2>
          <p className="mt-2 text-slate-700">
            عادةً نرد خلال 24-48 ساعة. للاقتراحات أو البلاغات أو استفسارات الحساب، استخدم{" "}
            <Link href="/ar/contact" className="text-[#045FA6] hover:underline">
              نموذج التواصل
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

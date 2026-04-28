import { notFound } from "next/navigation";
import Link from "next/link";
import PrivacyPage from "@/app/privacy/page";
import { PageViewTracker } from "@/components/site/PageViewTracker";
import { getDirection, isLocale } from "@/i18n/config";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedPrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  if (locale === "en") {
    return (
      <div lang={locale} dir={getDirection(locale)}>
        <PrivacyPage />
      </div>
    );
  }

  return (
    <div lang={locale} dir={getDirection(locale)}>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <PageViewTracker eventName="privacy_page_viewed" path="/ar/privacy" />
        <h1 className="text-3xl font-bold text-white">سياسة الخصوصية</h1>
        <p className="mt-2 text-sm text-slate-300">آخر تحديث: 21 أبريل 2026</p>

        <div className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">ما البيانات التي نجمعها</h2>
            <p>
              نجمع بيانات الحساب التي تقدمها (مثل بريد شركة الطيران وبيانات الملف الشخصي)، إضافة إلى بيانات الجداول
              والتبديلات التي ترفعها، وبعض تحليلات الاستخدام الأساسية لتحسين الأداء وسهولة الاستخدام.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">لماذا نجمع هذه البيانات</h2>
            <p>
              نستخدم بياناتك لتشغيل نظام المطابقة بكفاءة، وتحسين موثوقية الخدمة، ومنع إساءة الاستخدام، والاستجابة
              لطلبات الدعم.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">من يمكنه رؤية معلوماتك</h2>
            <p>
              يتم عرض البيانات ضمن الحد الأدنى اللازم لتشغيل المنصة. ولا يتم إظهار بيانات الحساب الحساسة للعامة.
              وقد يطّلع المستخدمون المشاركون في سوق التبديل على المعلومات الضرورية لتقييم فرص المطابقة فقط.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">الاحتفاظ بالبيانات والحذف</h2>
            <p>
              نحتفظ بالبيانات لأغراض التشغيل والدعم. وإذا رغبت في تصحيح بياناتك أو حذفها، يمكنك إرسال طلب عبر{" "}
              <Link href="/ar/contact" className="text-[#045FA6] hover:underline">
                صفحة التواصل
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">ملفات تعريف الارتباط والتحليلات</h2>
            <p>
              نستخدم ملفات تعريف ارتباط أساسية وبيانات الجلسات لأغراض تسجيل الدخول، إلى جانب تحليلات خفيفة لفهم
              اتجاهات الاستخدام وتحسين التجربة.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

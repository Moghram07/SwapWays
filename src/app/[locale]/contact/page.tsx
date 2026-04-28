import { notFound } from "next/navigation";
import Link from "next/link";
import ContactPage from "@/app/contact/page";
import { ContactForm } from "@/components/site/ContactForm";
import { PageViewTracker } from "@/components/site/PageViewTracker";
import { getDirection, isLocale } from "@/i18n/config";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  if (locale === "en") {
    return (
      <div lang={locale} dir={getDirection(locale)}>
        <ContactPage />
      </div>
    );
  }

  return (
    <div lang={locale} dir={getDirection(locale)}>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <PageViewTracker eventName="contact_page_viewed" path="/ar/contact" />
        <h1 className="text-3xl font-bold text-white">تواصل معنا</h1>
        <p className="mt-3 text-slate-200">
          أسئلتك واقتراحاتك وأفكارك محل اهتمامنا دائمًا. شاركنا ما تحتاجه لنواصل تحسين التجربة لأطقم الطيران.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ContactForm locale="ar" />
        </div>

        <div className="mt-6 text-sm text-slate-300">
          تفضل البدء بالمساعدة الذاتية أولًا؟ تفضل بزيارة{" "}
          <Link href="/ar/support" className="text-sky-300 hover:text-sky-200 hover:underline">
            صفحة الدعم
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { PageViewTracker } from "@/components/site/PageViewTracker";

const lastUpdated = "April 21, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <PageViewTracker eventName="privacy_page_viewed" path="/privacy" />
      <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-300">Last updated: {lastUpdated}</p>

      <div className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">What we collect</h2>
          <p>
            We collect account data you provide (such as airline email and profile details), schedule/trade data you
            upload, and basic product analytics to improve performance and usability.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Why we collect it</h2>
          <p>
            We use your data to run swap matching, improve reliability, prevent abuse, and support customer requests.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Who can see your information</h2>
          <p>
            Visibility is limited to what is needed for product functions. Sensitive account data is not publicly
            shown. Marketplace participants may see relevant swap information needed to evaluate matches.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Retention and deletion</h2>
          <p>
            We retain data for operational and support purposes. If you need data correction or deletion, send a
            request through our{" "}
            <Link href="/contact" className="text-[#045FA6] hover:underline">
              Contact page
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Cookies and analytics</h2>
          <p>
            We use essential cookies/session storage for authentication and lightweight analytics to understand product
            usage trends and improve the experience.
          </p>
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { PageViewTracker } from "@/components/site/PageViewTracker";

const lastUpdated = "April 21, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <PageViewTracker eventName="terms_page_viewed" path="/terms" />
      <h1 className="text-3xl font-bold text-slate-900">Terms of Use</h1>
      <p className="mt-2 text-sm text-slate-500">Effective date: {lastUpdated}</p>

      <div className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Eligibility and account use</h2>
          <p>
            You are responsible for accurate account information and secure access to your account. Airline email
            verification may be required to use core product features.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Acceptable use</h2>
          <p>
            Do not misuse the platform, spam other users, impersonate crew members, attempt fraud, or interfere with
            service operation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Data and posting responsibility</h2>
          <p>
            You are responsible for the accuracy of schedules, trade details, and messages you post through the
            platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Service availability and changes</h2>
          <p>
            We may update features, pricing, and policies as the product evolves. We aim to communicate major updates
            clearly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Suspension and termination</h2>
          <p>
            Accounts may be limited or removed for abuse, policy violations, or behavior that harms user safety or
            platform trust.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Questions about these terms</h2>
          <p>
            For clarification requests, reach out through our{" "}
            <Link href="/contact" className="text-[#045FA6] hover:underline">
              Contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

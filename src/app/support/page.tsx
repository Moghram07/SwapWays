import Link from "next/link";
import { PageViewTracker } from "@/components/site/PageViewTracker";

const lastUpdated = "April 21, 2026";

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <PageViewTracker eventName="support_page_viewed" path="/support" />
      <h1 className="text-3xl font-bold text-slate-900">Support</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {lastUpdated}</p>
      <p className="mt-4 text-slate-700">
        Need help with signup, verification, schedule upload, or your trial? Start here, then contact us if you still
        need assistance.
      </p>

      <section className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Quick FAQ</h2>
        <div>
          <h3 className="font-semibold text-slate-900">I did not receive my verification code.</h3>
          <p className="text-slate-700">
            Wait one minute, check spam/junk, then resend from the verification page. Make sure you used your airline
            email correctly.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Why did my schedule upload fail?</h3>
          <p className="text-slate-700">
            Confirm your file is clear and complete. If parsing still fails, send the issue through Contact so we can
            improve parser coverage.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">How does the trial extension work?</h3>
          <p className="text-slate-700">
            Every verified user gets 15 days. You can unlock up to 30 total days through qualified actions such as
            schedule upload and referral milestones.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Contact Support</h2>
        <p className="mt-2 text-slate-700">
          We usually respond within 24-48 hours. For product suggestions, bug reports, or account questions, use our{" "}
          <Link href="/contact" className="text-[#045FA6] hover:underline">
            Contact form
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

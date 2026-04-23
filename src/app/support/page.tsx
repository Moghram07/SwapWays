import Link from "next/link";
import { PageViewTracker } from "@/components/site/PageViewTracker";

const lastUpdated = "April 21, 2026";

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <PageViewTracker eventName="support_page_viewed" path="/support" />
      <h1 className="text-3xl font-bold text-white">Support</h1>
      <p className="mt-2 text-sm text-slate-300">Last updated: {lastUpdated}</p>
      <p className="mt-4 text-slate-200">
        Need help with signup, verification, schedule upload, or your trial? Start here, then contact us if you still
        need assistance.
      </p>

      <section className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Quick FAQ</h2>
        <div>
          <h3 className="font-semibold text-slate-900">How do I verify my account?</h3>
          <p className="text-slate-700">
            Account verification is completed when you successfully upload your schedule. If upload parsing fails, use
            the Contact form and include a short description of the issue.
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
            You start with 10 days free. Referred signups start with 20 days, schedule upload adds +10 once, and each
            successful referral adds +10 (up to 3 referrals), capped at 50 total days.
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

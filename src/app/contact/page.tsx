import Link from "next/link";
import { ContactForm } from "@/components/site/ContactForm";
import { PageViewTracker } from "@/components/site/PageViewTracker";

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <PageViewTracker eventName="contact_page_viewed" path="/contact" />
      <h1 className="text-3xl font-bold text-slate-900">Contact</h1>
      <p className="mt-3 text-slate-700">
        Questions, suggestions, and product ideas are always welcome. Tell us what you need so we can improve the
        experience for crew members.
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ContactForm />
      </div>

      <div className="mt-6 text-sm text-slate-600">
        Prefer self-service first? Visit{" "}
        <Link href="/support" className="text-[#045FA6] hover:underline">
          Support
        </Link>
        .
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

type Category = "QUESTION" | "SUGGESTION" | "BUG" | "OTHER";

type ContactFormText = {
  errorSend: string;
  successSend: string;
  nameOptional: string;
  namePlaceholder: string;
  emailOptional: string;
  emailPlaceholder: string;
  category: string;
  question: string;
  suggestion: string;
  bug: string;
  other: string;
  subjectOptional: string;
  subjectPlaceholder: string;
  message: string;
  messagePlaceholder: string;
  sending: string;
  send: string;
};

const enText: ContactFormText = {
  errorSend: "Failed to send message.",
  successSend: "Thanks for your message. We review every submission and use it to improve Swap Ways.",
  nameOptional: "Name (optional)",
  namePlaceholder: "Your name",
  emailOptional: "Email (optional)",
  emailPlaceholder: "you@example.com",
  category: "Category",
  question: "Question",
  suggestion: "Suggestion / Idea",
  bug: "Bug / Problem",
  other: "Other",
  subjectOptional: "Subject (optional)",
  subjectPlaceholder: "Short summary",
  message: "Message",
  messagePlaceholder: "Questions, ideas, and suggestions are welcome.",
  sending: "Sending...",
  send: "Send message",
};

const arText: ContactFormText = {
  errorSend: "تعذر إرسال الرسالة. يرجى المحاولة مرة أخرى.",
  successSend: "شكرًا لرسالتك. نراجع جميع الملاحظات ونستخدمها لتحسين تجربة Swap Ways.",
  nameOptional: "الاسم (اختياري)",
  namePlaceholder: "اسمك",
  emailOptional: "البريد الإلكتروني (اختياري)",
  emailPlaceholder: "you@example.com",
  category: "التصنيف",
  question: "سؤال",
  suggestion: "اقتراح أو فكرة",
  bug: "خلل أو مشكلة",
  other: "أخرى",
  subjectOptional: "الموضوع (اختياري)",
  subjectPlaceholder: "ملخص مختصر",
  message: "الرسالة",
  messagePlaceholder: "يسعدنا استقبال أسئلتك وأفكارك وملاحظاتك.",
  sending: "جارٍ الإرسال...",
  send: "إرسال الرسالة",
};

export function ContactForm({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const text = locale === "ar" ? arText : enText;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("QUESTION");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || undefined,
        email: email || undefined,
        subject: subject || undefined,
        category,
        message,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.message ?? text.errorSend);
      return;
    }

    setSuccess(text.successSend);
    setMessage("");
    setSubject("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactName">{text.nameOptional}</Label>
          <Input
            id="contactName"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder={text.namePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">{text.emailOptional}</Label>
          <Input
            id="contactEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={text.emailPlaceholder}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactCategory">{text.category}</Label>
        <select
          id="contactCategory"
          className="form-select w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          <option value="QUESTION">{text.question}</option>
          <option value="SUGGESTION">{text.suggestion}</option>
          <option value="BUG">{text.bug}</option>
          <option value="OTHER">{text.other}</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactSubject">{text.subjectOptional}</Label>
        <Input
          id="contactSubject"
          value={subject}
          maxLength={160}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={text.subjectPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactMessage">{text.message}</Label>
        <textarea
          id="contactMessage"
          className="min-h-36 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minLength={10}
          maxLength={4000}
          required
          placeholder={text.messagePlaceholder}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? text.sending : text.send}
      </Button>
    </form>
  );
}

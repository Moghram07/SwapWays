"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localizePath, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

type Props = {
  locale: Locale;
};

export function ForgotPasswordForm({ locale }: Props) {
  const t = getTranslator(locale);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const json = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        console.error("[forgot-password] API response:", res.status, json);
        const code = typeof json.code === "string" ? json.code : "";
        if (code === "MISSING_EMAIL_CONFIG") {
          setError(t("auth.forgotPasswordNotConfigured"));
        } else if (code === "MISSING_PUBLIC_BASE") {
          setError(t("auth.forgotPasswordServerUrl"));
        } else if (code === "RESEND_REJECTED") {
          setError(t("auth.forgotPasswordSendFailed"));
        } else {
          setError(t("auth.forgotPasswordError"));
        }
        return;
      }
      setMessage(t("auth.forgotPasswordSuccess"));
    } catch {
      setLoading(false);
      setError(t("auth.forgotPasswordError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div className="space-y-2">
        <Label htmlFor="forgot-email">{t("auth.email")}</Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@saudia.com"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("auth.forgotPasswordSending") : t("auth.forgotPasswordSubmit")}
      </Button>
      <p className="text-center text-sm text-slate-600">
        <a href={localizePath("/login", locale)} className="font-medium text-[#045FA6] hover:underline">
          {t("auth.backToSignIn")}
        </a>
      </p>
    </form>
  );
}

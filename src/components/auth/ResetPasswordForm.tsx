"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localizePath, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

type Props = {
  locale: Locale;
};

export function ResetPasswordForm({ locale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = getTranslator(locale);
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-600">{t("auth.resetPasswordMissingToken")}</p>
        <a href={localizePath("/forgot-password", locale)} className="text-sm font-medium text-[#045FA6] hover:underline">
          {t("auth.forgotPasswordLink")}
        </a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("auth.resetPasswordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.resetPasswordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setError(typeof json.message === "string" ? json.message : t("auth.resetPasswordFailed"));
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(localizePath("/login", locale));
        router.refresh();
      }, 2000);
    } catch {
      setLoading(false);
      setError(t("auth.resetPasswordFailed"));
    }
  }

  if (success) {
    return <p className="text-center text-sm text-green-700">{t("auth.resetPasswordSuccess")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <p className="text-xs text-slate-500">{t("auth.resetPasswordHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">{t("auth.confirmNewPassword")}</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("auth.resetPasswordSaving") : t("auth.resetPasswordSubmit")}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_LOCALE, getLocaleFromPathname, localizePath } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname ?? "") ?? DEFAULT_LOCALE;
  const t = getTranslator(locale);
  const callbackUrlRaw = searchParams.get("callbackUrl");
  const callbackUrl =
    callbackUrlRaw && callbackUrlRaw.startsWith("/") && !callbackUrlRaw.startsWith("//")
      ? callbackUrlRaw
      : "/dashboard/board";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(t("auth.invalidCredentials"));
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <a
            href={localizePath("/forgot-password", locale)}
            className="text-xs font-medium text-[#045FA6] hover:underline"
          >
            {t("auth.forgotPasswordLink")}
          </a>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
      <p className="text-center text-sm text-slate-600">
        {t("auth.noAccount")}{" "}
        <a href={localizePath("/register", locale)} className="font-medium text-[#045FA6] hover:underline">
          {t("auth.signUp")}
        </a>
      </p>
    </form>
  );
}

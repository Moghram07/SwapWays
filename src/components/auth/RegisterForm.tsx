"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAllAirlineConfigs } from "@/config/airlines";
import { DEFAULT_LOCALE, getLocaleFromPathname, localizePath, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

const airlines = getAllAirlineConfigs();

export function RegisterForm({
  locale: localeProp,
}: {
  locale?: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const locale = localeProp ?? getLocaleFromPathname(pathname ?? "") ?? DEFAULT_LOCALE;
  const t = getTranslator(locale);
  const [step, setStep] = useState(1);
  const [airlineId, setAirlineId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [crewId, setCrewId] = useState("");
  const [rankId, setRankId] = useState("");
  const [baseId, setBaseId] = useState("");
  const [qualificationIds, setQualificationIds] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);

  const selectedConfig = useMemo(() => airlines.find((a) => a.code === airlineId), [airlineId]);
  const ranks = useMemo(
    () => [...(selectedConfig?.ranks.cabin ?? []), ...(selectedConfig?.ranks.flightDeck ?? [])],
    [selectedConfig]
  );
  const bases = useMemo(() => {
    const allBases = selectedConfig?.bases ?? [];
    if (selectedConfig?.code !== "SV") return allBases;
    return allBases.filter((b) => b.airportCode === "JED" || b.airportCode === "RUH");
  }, [selectedConfig]);
  const aircraftTypes = selectedConfig?.aircraftTypes ?? [];

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("ref");
    if (value) {
      setReferralCode(value.toUpperCase());
    }
  }, []);

  useEffect(() => {
    // Security hardening: entering signup should not inherit a prior authenticated session.
    if (status !== "authenticated") return;
    let cancelled = false;
    setResettingSession(true);
    void signOut({ redirect: false }).finally(() => {
      if (cancelled) return;
      setResettingSession(false);
      router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "registration_started",
        path: "/register",
        properties: { airlineCode: airlineId },
      }),
    }).catch(() => {});
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        crewId,
        airlineCode: airlineId,
        rankId,
        baseId,
        qualificationIds,
        phone: phone || undefined,
        referralCode: referralCode || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.message ?? t("auth.registrationFailed"));
      return;
    }
    router.push(`${localizePath("/login", locale)}?registered=1`);
    router.refresh();
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        {resettingSession && (
          <p className="text-sm text-slate-600">{t("auth.registering")}</p>
        )}
        <h2 className="text-lg font-semibold">{t("auth.selectAirline")}</h2>
        <p className="text-sm text-slate-600">{t("auth.phaseOne")}</p>
        <select
          id="airline"
          aria-label={t("auth.chooseAirline")}
          className="form-select w-full text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
          value={airlineId}
          onChange={(e) => setAirlineId(e.target.value)}
        >
          <option value="">{t("auth.chooseAirline")}</option>
          {airlines.map((a) => (
            <option key={a.code} value={a.code} className="bg-white text-slate-900">
              {a.name}
            </option>
          ))}
        </select>
        <Button type="button" onClick={() => setStep(2)} disabled={!airlineId || resettingSession}>
          {t("auth.next")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t("auth.firstName")}</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t("auth.lastName")}</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
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
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="crewId">{t("auth.crewId")}</Label>
        <Input id="crewId" value={crewId} onChange={(e) => setCrewId(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rank">{t("auth.rank")}</Label>
        <select
          id="rank"
          className="form-select w-full text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
          value={rankId}
          onChange={(e) => setRankId(e.target.value)}
          required
        >
          <option value="">{t("auth.selectRank")}</option>
          {ranks.map((r) => (
            <option key={r.code} value={r.code} className="bg-white text-slate-900">
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="base">{t("auth.base")}</Label>
        <select
          id="base"
          className="form-select w-full text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
          value={baseId}
          onChange={(e) => setBaseId(e.target.value)}
          required
        >
          <option value="">{t("auth.selectBase")}</option>
          {bases.map((b) => (
            <option key={b.airportCode} value={b.airportCode} className="bg-white text-slate-900">
              {b.name} ({b.airportCode})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>{t("auth.aircraftQualifications")}</Label>
        <div className="flex flex-wrap gap-2 text-slate-950">
          {aircraftTypes.map((at) => (
            <label
              key={at.code}
              className="qualification-label flex cursor-pointer items-center gap-2 text-sm font-semibold"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-[#045FA6] focus:ring-[#045FA6]"
                checked={qualificationIds.includes(at.code)}
                onChange={(e) =>
                  setQualificationIds((prev) =>
                    e.target.checked ? [...prev, at.code] : prev.filter((id) => id !== at.code)
                  )
                }
              />
              <span className="text-slate-950">{at.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t("auth.phoneOptional")}</Label>
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="referralCode">{t("auth.referralCodeOptional")}</Label>
        <Input
          id="referralCode"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          placeholder={t("auth.referralPlaceholder")}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setStep(1)}>
          {t("auth.back")}
        </Button>
        <Button type="submit" disabled={loading || resettingSession}>
          {loading ? t("auth.registering") : t("auth.register")}
        </Button>
      </div>
      <p className="text-sm text-slate-600">
        {t("auth.haveAccount")}{" "}
        <Link href={localizePath("/login", locale)} className="text-sky-600 hover:underline">{t("auth.logIn")}</Link>
      </p>
    </form>
  );
}

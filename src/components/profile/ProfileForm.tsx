"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const PRIMARY = "#1E6FB9";

interface ProfileFormProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    crewId: string;
    phone: string | null;
    rankId: string;
    baseId: string;
    hasUsVisa: boolean;
    hasChinaVisa: boolean;
    qualificationIds: string[];
  };
  ranks: { id: string; code: string; name: string }[];
  bases: { id: string; name: string; airportCode: string }[];
  aircraftTypes: { id: string; code: string; name: string }[];
}

export function ProfileForm({ user, ranks, bases, aircraftTypes }: ProfileFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [rankId, setRankId] = useState(user.rankId);
  const [baseId, setBaseId] = useState(user.baseId);
  const [hasUsVisa, setHasUsVisa] = useState(user.hasUsVisa);
  const [hasChinaVisa, setHasChinaVisa] = useState(user.hasChinaVisa);
  const [qualificationIds, setQualificationIds] = useState<string[]>(user.qualificationIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(
    ranks.length === 0 || bases.length === 0 || aircraftTypes.length === 0
  );
  const [rankOptions, setRankOptions] = useState(ranks);
  const [baseOptions, setBaseOptions] = useState(bases);
  const [aircraftTypeOptions, setAircraftTypeOptions] = useState(aircraftTypes);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const hasTypedPasswordConfirmation = newPassword.length > 0 || confirmNewPassword.length > 0;
  const passwordConfirmationMatches = newPassword.length > 0 && newPassword === confirmNewPassword;
  const passwordConfirmationMismatches =
    hasTypedPasswordConfirmation && confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;
  const newPasswordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const newPasswordSameAsCurrent = currentPassword.length > 0 && newPassword === currentPassword;
  const canSubmitPasswordChange =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmNewPassword.length > 0 &&
    passwordConfirmationMatches &&
    !newPasswordSameAsCurrent;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        phone: phone || undefined,
        rankId,
        baseId,
        hasUsVisa,
        hasChinaVisa,
        qualificationIds,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.message ?? "Update failed.");
      return;
    }
    router.refresh();
  }

  function toggleQualification(id: string) {
    setQualificationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handlePasswordChange() {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setPasswordLoading(true);
    const res = await fetch("/api/profile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json().catch(() => ({} as { message?: string }));
    setPasswordLoading(false);

    if (!res.ok) {
      setPasswordError(json.message ?? "Failed to update password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordSuccess("Password updated successfully.");
  }

  const selectClass =
    "form-select w-full h-11 text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FB9] focus:border-[#1E6FB9]";

  useEffect(() => {
    let active = true;
    async function hydrateProfile() {
      try {
        const [profileRes, optionsRes] = await Promise.all([
          fetch("/api/profile", { credentials: "include" }),
          fetch("/api/profile/options", { credentials: "include" }),
        ]);

        if (profileRes.ok) {
          const profileJson = (await profileRes.json().catch(() => null)) as {
            data?: {
              firstName?: string;
              lastName?: string;
              phone?: string | null;
              rank?: { id: string } | null;
              base?: { id: string } | null;
              hasUsVisa?: boolean;
              hasChinaVisa?: boolean;
              qualifications?: { aircraftType?: { id: string } }[];
            };
          } | null;
          const p = profileJson?.data;
          if (active && p) {
            if (typeof p.firstName === "string" && p.firstName) setFirstName(p.firstName);
            if (typeof p.lastName === "string" && p.lastName) setLastName(p.lastName);
            if (typeof p.phone === "string" || p.phone === null) setPhone(p.phone ?? "");
            if (p.rank?.id) setRankId(p.rank.id);
            if (p.base?.id) setBaseId(p.base.id);
            if (typeof p.hasUsVisa === "boolean") setHasUsVisa(p.hasUsVisa);
            if (typeof p.hasChinaVisa === "boolean") setHasChinaVisa(p.hasChinaVisa);
            if (Array.isArray(p.qualifications)) {
              setQualificationIds(p.qualifications.map((q) => q.aircraftType?.id).filter((id): id is string => Boolean(id)));
            }
          }
        }

        if (optionsRes.ok) {
          const optionsJson = (await optionsRes.json().catch(() => null)) as {
            data?: {
              ranks?: { id: string; code: string; name: string }[];
              bases?: { id: string; name: string; airportCode: string }[];
              aircraftTypes?: { id: string; code: string; name: string }[];
            };
          } | null;
          if (active) {
            setRankOptions(optionsJson?.data?.ranks ?? []);
            setBaseOptions(optionsJson?.data?.bases ?? []);
            setAircraftTypeOptions(optionsJson?.data?.aircraftTypes ?? []);
          }
        }
      } finally {
        if (active) setOptionsLoading(false);
      }
    }

    void hydrateProfile();
    return () => {
      active = false;
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-slate-500">Email: {user.email} · Crew ID: {user.crewId}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Rank</Label>
            <select className={selectClass} value={rankId} onChange={(e) => setRankId(e.target.value)}>
              {rankOptions.map((r) => (
                <option key={r.id} value={r.id} className="bg-white text-slate-900">
                  {r.name}
                </option>
              ))}
            </select>
            {optionsLoading && rankOptions.length === 0 && (
              <p className="text-xs text-slate-500">Loading rank options…</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Base</Label>
            <select className={selectClass} value={baseId} onChange={(e) => setBaseId(e.target.value)}>
              {baseOptions.map((b) => (
                <option key={b.id} value={b.id} className="bg-white text-slate-900">
                  {b.name} ({b.airportCode})
                </option>
              ))}
            </select>
            {optionsLoading && baseOptions.length === 0 && (
              <p className="text-xs text-slate-500">Loading base options…</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aircraft Qualifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-slate-500">Select the aircraft types you are qualified to fly.</p>
          <div className="flex flex-wrap gap-2">
            {aircraftTypeOptions.map((at) => {
              const selected = qualificationIds.includes(at.id);
              return (
                <button
                  key={at.id}
                  type="button"
                  onClick={() => toggleQualification(at.id)}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    selected
                      ? "border-transparent text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  style={selected ? { backgroundColor: PRIMARY } : undefined}
                >
                  {selected ? "✓ " : ""}
                  {at.name}
                </button>
              );
            })}
          </div>
          {optionsLoading && aircraftTypeOptions.length === 0 && (
            <p className="mt-3 text-xs text-slate-500">Loading aircraft qualifications…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Travel Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-slate-500">
            Some destinations require crew visas. Select the visas you currently hold.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hasUsVisa}
                onChange={(e) => setHasUsVisa(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              United States visa
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hasChinaVisa}
                onChange={(e) => setHasChinaVisa(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              China visa
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-emerald-700">{passwordSuccess}</p>}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              {newPasswordTooShort && (
                <p className="text-xs text-amber-700">Use at least 8 characters.</p>
              )}
              {newPasswordSameAsCurrent && (
                <p className="text-xs text-red-600">New password must be different from current password.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm new password</Label>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              {passwordConfirmationMatches && (
                <p className="text-xs text-emerald-700">Passwords match.</p>
              )}
              {passwordConfirmationMismatches && (
                <p className="text-xs text-red-600">Passwords do not match yet.</p>
              )}
            </div>
            <Button
              type="button"
              onClick={() => void handlePasswordChange()}
              disabled={passwordLoading || !canSubmitPasswordChange}
              variant="outline"
            >
              {passwordLoading ? "Updating…" : "Change password"}
            </Button>
            {!passwordLoading && canSubmitPasswordChange && (
              <p className="text-xs text-emerald-700">Ready to change password.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
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
      const json = await res.json();
      setError(json.message ?? "Update failed.");
      return;
    }
    router.refresh();
  }

  function toggleQualification(id: string) {
    setQualificationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectClass =
    "form-select w-full h-11 text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FB9] focus:border-[#1E6FB9]";

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
              {ranks.map((r) => (
                <option key={r.id} value={r.id} className="bg-white text-slate-900">
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Base</Label>
            <select className={selectClass} value={baseId} onChange={(e) => setBaseId(e.target.value)}>
              {bases.map((b) => (
                <option key={b.id} value={b.id} className="bg-white text-slate-900">
                  {b.name} ({b.airportCode})
                </option>
              ))}
            </select>
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
            {aircraftTypes.map((at) => {
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

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

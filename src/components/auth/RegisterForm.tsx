"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAllAirlineConfigs } from "@/config/airlines";

const airlines = getAllAirlineConfigs();

export function RegisterForm() {
  const router = useRouter();
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedConfig = useMemo(() => airlines.find((a) => a.code === airlineId), [airlineId]);
  const ranks = useMemo(
    () => [...(selectedConfig?.ranks.cabin ?? []), ...(selectedConfig?.ranks.flightDeck ?? [])],
    [selectedConfig]
  );
  const bases = selectedConfig?.bases ?? [];
  const aircraftTypes = selectedConfig?.aircraftTypes ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
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
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.message ?? "Registration failed.");
      return;
    }
    router.push("/login?registered=1");
    router.refresh();
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Select airline</h2>
        <p className="text-sm text-slate-600">Phase 1: Saudia only.</p>
        <select
          className="form-select w-full text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
          value={airlineId}
          onChange={(e) => setAirlineId(e.target.value)}
        >
          <option value="">Choose airline</option>
          {airlines.map((a) => (
            <option key={a.code} value={a.code} className="bg-white text-slate-900">
              {a.name}
            </option>
          ))}
        </select>
        <Button type="button" onClick={() => setStep(2)} disabled={!airlineId}>
          Next
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Airline email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`@${selectedConfig?.emailDomain ?? ""}`}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="crewId">Crew ID / Payroll number</Label>
        <Input id="crewId" value={crewId} onChange={(e) => setCrewId(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Rank</Label>
        <select
          className="form-select w-full text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
          value={rankId}
          onChange={(e) => setRankId(e.target.value)}
          required
        >
          <option value="">Select rank</option>
          {ranks.map((r) => (
            <option key={r.code} value={r.code} className="bg-white text-slate-900">
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Base</Label>
        <select
          className="form-select w-full text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
          value={baseId}
          onChange={(e) => setBaseId(e.target.value)}
          required
        >
          <option value="">Select base</option>
          {bases.map((b) => (
            <option key={b.airportCode} value={b.airportCode} className="bg-white text-slate-900">
              {b.name} ({b.airportCode})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Aircraft qualifications</Label>
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
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Registering…" : "Register"}
        </Button>
      </div>
      <p className="text-sm text-slate-600">
        Already have an account? <Link href="/login" className="text-sky-600 hover:underline">Log in</Link>
      </p>
    </form>
  );
}

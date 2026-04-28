"use client";

import { useMemo, useState } from "react";
import { formatDateShort } from "@/utils/timeFormat";

const DURATION_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 15, label: "15 days" },
  { value: 30, label: "1 month" },
  { value: 90, label: "3 months" },
  { value: 180, label: "6 months" },
  { value: 365, label: "1 year" },
  { value: 0, label: "Custom" },
];

type ManagedUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: string;
  subscriptionStatus: string;
  trialEndsAt: string;
};

type Props = {
  user: ManagedUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

export function GrantPremiumModal({ user, isOpen, onClose, onSuccess }: Props) {
  const [duration, setDuration] = useState<number>(30);
  const [customDays, setCustomDays] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDays = duration === 0 ? Number(customDays || 0) : duration;
  const previewDate = useMemo(() => {
    if (effectiveDays <= 0) return null;
    const now = Date.now();
    return new Date(now + effectiveDays * 24 * 60 * 60 * 1000);
  }, [effectiveDays]);

  if (!isOpen) return null;

  async function postJson(path: string, body: Record<string, unknown>) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) throw new Error(json.message || "Request failed");
  }

  async function handleGrant() {
    if (effectiveDays <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await postJson("/api/admin/users/grant-premium", {
        userId: user.id,
        days: effectiveDays,
        reason: reason.trim() || null,
      });
      await onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grant premium");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke() {
    setSubmitting(true);
    setError(null);
    try {
      await postJson("/api/admin/users/revoke-premium", {
        userId: user.id,
        reason: reason.trim() || null,
      });
      await onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke premium");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Manage Premium</h2>
        <p className="mb-4 text-sm text-slate-600">
          {user.firstName} {user.lastName} ({user.email})
        </p>

        <div className="mb-4 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Current tier</span>
            <span className="font-medium text-slate-900">{user.tier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span className="font-medium text-slate-900">{user.subscriptionStatus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Expires</span>
            <span className="font-medium text-slate-900">{formatDateShort(user.trialEndsAt)}</span>
          </div>
        </div>

        <label className="mb-2 block text-sm font-medium text-slate-700">Grant premium for</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDuration(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                duration === opt.value
                  ? "border-[#1E6FB9] bg-[#E3EFF9] text-[#1E6FB9]"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {duration === 0 && (
          <div className="mb-3">
            <input
              type="number"
              min={1}
              max={3650}
              value={customDays}
              onChange={(e) => setCustomDays(Number(e.target.value) || "")}
              className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="Custom days"
            />
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700">Reason (optional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          placeholder="Internal note"
        />

        {previewDate && (
          <div className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            Premium until: <strong>{formatDateShort(previewDate)}</strong>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGrant}
            disabled={submitting || effectiveDays <= 0}
            className="flex-1 rounded-xl bg-[#1E6FB9] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Working..." : "Grant Premium"}
          </button>
          {user.tier === "PREMIUM" && (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={submitting}
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 disabled:opacity-50"
            >
              Revoke
            </button>
          )}
        </div>
        <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-sm text-slate-500">
          Cancel
        </button>
      </div>
    </div>
  );
}

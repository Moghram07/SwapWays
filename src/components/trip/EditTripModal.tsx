"use client";

import { useCallback, useEffect, useState } from "react";
import type { TripCardData } from "@/types/tripCard";

/** Schedule time "02.45Z" -> input value "02:45". */
function scheduleTimeToInput(timeStr: string | undefined): string {
  if (!timeStr) return "";
  const clean = timeStr.replace("Z", "").trim().replace(".", ":");
  return clean;
}

/** Input "02:45" -> schedule "02.45Z". */
function inputToScheduleTime(s: string): string {
  const t = s.trim().replace(":", ".");
  if (!t) return "";
  return t.endsWith("Z") ? t : t + "Z";
}

interface FetchedLeg {
  id: string;
  legOrder: number;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
}

interface FetchedTrip {
  id: string;
  reportTime: string;
  legs: FetchedLeg[];
}

interface EditTripModalProps {
  scheduleTripId: string;
  trip: TripCardData;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTripModal({
  scheduleTripId,
  trip,
  onClose,
  onSaved,
}: EditTripModalProps) {
  const [reportTime, setReportTime] = useState("");
  const [legs, setLegs] = useState<Array<{ id: string; dep: string; arr: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/trips/${scheduleTripId}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message ?? "Failed to load trip");
        return;
      }
      const json = await res.json().catch(() => ({}));
      const data = json.data as FetchedTrip;
      setReportTime(scheduleTimeToInput(data.reportTime));
      setLegs(
        data.legs.map((l) => ({
          id: l.id,
          dep: scheduleTimeToInput(l.departureTime),
          arr: scheduleTimeToInput(l.arrivalTime),
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, [scheduleTripId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: {
        reportTime?: string;
        legs?: Array<{ id: string; departureTime?: string; arrivalTime?: string }>;
      } = {};
      const rt = inputToScheduleTime(reportTime);
      if (rt) body.reportTime = rt;
      body.legs = legs.map((leg) => {
        const dep = inputToScheduleTime(leg.dep);
        const arr = inputToScheduleTime(leg.arr);
        return {
          id: leg.id,
          ...(dep && { departureTime: dep }),
          ...(arr && { arrivalTime: arr }),
        };
      });
      const res = await fetch(`/api/schedule/trips/${scheduleTripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message ?? "Failed to save");
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateLeg = (index: number, field: "dep" | "arr", value: string) => {
    setLegs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit trip times</h2>
          <p className="mt-1 text-sm text-gray-500">
            {trip.legs[0]?.flightNumber ? `Trip ${trip.legs[0].flightNumber}` : ""} — report and leg times
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Report time (Zulu)</label>
                <input
                  type="text"
                  value={reportTime}
                  onChange={(e) => setReportTime(e.target.value)}
                  placeholder="04:30"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              {legs.map((leg, index) => {
                const cardLeg = trip.legs[index];
                const legLabel = cardLeg
                  ? `${cardLeg.departureAirport} → ${cardLeg.arrivalAirport}`
                  : `Leg ${index + 1}`;
                return (
                  <div key={leg.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="mb-2 text-sm font-medium text-gray-700">{legLabel}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500">Dep (Zulu)</label>
                        <input
                          type="text"
                          value={leg.dep}
                          onChange={(e) => updateLeg(index, "dep", e.target.value)}
                          placeholder="02:30"
                          className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Arr (Zulu)</label>
                        <input
                          type="text"
                          value={leg.arr}
                          onChange={(e) => updateLeg(index, "arr", e.target.value)}
                          placeholder="06:45"
                          className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

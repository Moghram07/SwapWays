"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { getAllAirports } from "@/utils/airportNames";

export interface AirportMultiSelectModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** When set, first row is “Anything” (exclusive with specific airport picks). */
  showAnythingOption?: boolean;
  anythingSelected?: boolean;
  selectedCodes: string[];
  onApply: (result: { codes: string[]; anythingSelected: boolean }) => void;
  accentClassName?: string;
}

export function AirportMultiSelectModal({
  open,
  onClose,
  title,
  showAnythingOption = false,
  anythingSelected: initialAnything = false,
  selectedCodes: initialCodes,
  onApply,
  accentClassName = "border-[#3BA34A] bg-brand-green-soft text-[#3BA34A]",
}: AirportMultiSelectModalProps) {
  const allAirports = useMemo(() => getAllAirports(), []);
  const [search, setSearch] = useState("");
  const [draftAnything, setDraftAnything] = useState(initialAnything);
  const [draftCodes, setDraftCodes] = useState<string[]>(initialCodes);

  useEffect(() => {
    if (!open) return;
    setDraftAnything(initialAnything);
    setDraftCodes(initialCodes);
    setSearch("");
  }, [open, initialAnything, initialCodes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allAirports;
    return allAirports.filter(
      (a) => a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
    );
  }, [allAirports, search]);

  if (!open) return null;

  function toggleCode(code: string) {
    setDraftAnything(false);
    setDraftCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function handleAnything() {
    setDraftAnything(true);
    setDraftCodes([]);
  }

  function handleApply() {
    onApply({
      codes: draftAnything ? [] : draftCodes,
      anythingSelected: draftAnything,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="airport-modal-title"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-surface shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="airport-modal-title" className="text-base font-semibold text-content">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-2"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {showAnythingOption && (
            <button
              type="button"
              onClick={handleAnything}
              className={`mb-3 w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                draftAnything
                  ? accentClassName
                  : "border-line text-content-soft hover:border-line"
              }`}
            >
              Anything — open to any destination
            </button>
          )}

          <div className="relative mb-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city or airport code…"
              className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-content placeholder:text-faint"
            />
          </div>

          {!draftAnything && draftCodes.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {draftCodes.map((code) => {
                const city = allAirports.find((a) => a.code === code)?.city;
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-content"
                  >
                    {city ? `${code} · ${city}` : code}
                    <button
                      type="button"
                      onClick={() => toggleCode(code)}
                      className="text-muted hover:text-rose-600"
                      aria-label={`Remove ${code}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-line">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted">No airports found</div>
            ) : (
              filtered.map((airport) => {
                const selected = !draftAnything && draftCodes.includes(airport.code);
                return (
                  <button
                    key={airport.code}
                    type="button"
                    onClick={() => toggleCode(airport.code)}
                    className={`flex w-full items-center justify-between border-b border-slate-50 px-3 py-2.5 text-left text-sm last:border-b-0 ${
                      selected ? "bg-emerald-50 font-medium text-emerald-900" : "text-content hover:bg-surface-2"
                    }`}
                  >
                    <span>
                      {airport.code} — {airport.city}
                    </span>
                    {selected && <span className="text-emerald-700">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-content-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={Boolean(showAnythingOption && !draftAnything && draftCodes.length === 0)}
            className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

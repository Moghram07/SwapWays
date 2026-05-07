"use client";

import type { WantAcceptanceOption } from "@/types/swapPost";
import { DesiredDestinations } from "@/components/swap/DesiredDestinations";

export function WantAcceptanceOptionsEditor({
  value,
  onChange,
}: {
  value: WantAcceptanceOption[];
  onChange: (next: WantAcceptanceOption[]) => void;
}) {
  const rows = value.length > 0 ? value : [];

  function updateRow(index: number, patch: Partial<WantAcceptanceOption>) {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([...rows, { airportCodes: [], minBlockHours: null, maxBlockHours: null }]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Option {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
          <DesiredDestinations
            selected={row.airportCodes}
            onChange={(codes) => updateRow(index, { airportCodes: codes })}
            hideLabel
          />
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-0.5 text-xs text-slate-600">
              <span>Min block (h, optional)</span>
              <input
                type="number"
                min={0}
                max={99}
                step={1}
                value={row.minBlockHours ?? ""}
                onChange={(e) =>
                  updateRow(index, {
                    minBlockHours: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-gray-900"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs text-slate-600">
              <span>Max block (h, optional)</span>
              <input
                type="number"
                min={0}
                max={99}
                step={1}
                value={row.maxBlockHours ?? ""}
                onChange={(e) =>
                  updateRow(index, {
                    maxBlockHours: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-gray-900"
              />
            </label>
          </div>
          {index < rows.length - 1 && (
            <p className="text-center text-xs font-medium text-slate-400 pt-1">— or —</p>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-sm font-medium text-[#2668B0] hover:underline"
      >
        + Add another acceptable swap
      </button>
    </div>
  );
}

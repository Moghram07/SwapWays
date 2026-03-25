"use client";

interface LayoverEntry {
  destination: string;
  hours: number;
  minutes: number;
}

export function LayoverRow({
  layover,
  onChange,
  onRemove,
}: {
  layover: LayoverEntry;
  onChange: (updated: LayoverEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={layover.destination}
        onChange={(e) => onChange({ ...layover, destination: e.target.value.toUpperCase() })}
        placeholder="e.g. LHR"
        className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900"
      />
      <input
        type="number"
        min={0}
        max={99}
        value={layover.hours || ""}
        onChange={(e) => onChange({ ...layover, hours: Number(e.target.value) || 0 })}
        className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm text-slate-900"
        placeholder="0"
      />
      <span className="text-xs text-slate-400">h</span>
      <input
        type="number"
        min={0}
        max={59}
        value={layover.minutes || ""}
        onChange={(e) => onChange({ ...layover, minutes: Number(e.target.value) || 0 })}
        className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm text-slate-900"
        placeholder="0"
      />
      <span className="text-xs text-slate-400">m</span>
      <button type="button" onClick={onRemove} className="ml-1 text-sm text-red-500 hover:text-red-700">
        x
      </button>
    </div>
  );
}

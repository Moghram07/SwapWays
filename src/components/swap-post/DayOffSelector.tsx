"use client";

interface DayOffSelectorProps {
  scheduledDays: number[];
  selected: number[];
  onChange: (days: number[]) => void;
  month: number;
  year: number;
  onNext: () => void;
  onBack: () => void;
}

export function DayOffSelector({
  scheduledDays,
  selected,
  onChange,
  month,
  year,
  onNext,
  onBack,
}: DayOffSelectorProps) {
  const daysInMonth = new Date(year, month, 0).getDate();

  function toggle(day: number) {
    if (scheduledDays.includes(day)) return;
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => a - b));
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Select your days off</h2>
      <p className="text-sm text-slate-500">
        Choose the days off when you&apos;d like to fly. Days with scheduled flights are greyed out.
      </p>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const isScheduled = scheduledDays.includes(day);
          const isSelected = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              disabled={isScheduled}
              onClick={() => toggle(day)}
              className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                isScheduled
                  ? "cursor-not-allowed bg-slate-100 text-slate-300 line-through"
                  : isSelected
                    ? "bg-[#2668B0] text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-[#2668B0]"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-sm text-slate-600">
          Selected: {selected.length} day{selected.length !== 1 ? "s" : ""} off
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:underline">
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={selected.length === 0}
          className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

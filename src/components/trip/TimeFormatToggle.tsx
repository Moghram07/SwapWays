"use client";

import { useTimeFormat } from "@/hooks/useTimeFormat";

export function TimeFormatToggle() {
  const { format, setFormat } = useTimeFormat();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 font-medium">Time format:</span>
      <button
        type="button"
        onClick={() => setFormat("zulu")}
        className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
          format === "zulu"
            ? "bg-[#1E6FB9] text-white"
            : "bg-slate-100 text-[#1E6FB9] hover:bg-slate-200"
        }`}
      >
        Zulu
      </button>
      <button
        type="button"
        onClick={() => setFormat("local")}
        className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
          format === "local"
            ? "bg-[#3BA34A] text-white"
            : "bg-slate-100 text-[#3BA34A] hover:bg-slate-200"
        }`}
      >
        Local
      </button>
    </div>
  );
}


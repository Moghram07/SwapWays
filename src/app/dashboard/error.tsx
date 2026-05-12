"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] page error", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="mt-1 text-sm text-slate-500">
          This page ran into an error. Your data is safe.
        </p>
      </div>
      <button
        onClick={reset}
        type="button"
        className="rounded-lg bg-[#1E6FB9] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}

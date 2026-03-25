"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

const PRIMARY = "#1E6FB9";

interface ScheduleUploadCardProps {
  onUploadSuccess?: () => void;
}

export function ScheduleUploadCard({ onUploadSuccess }: ScheduleUploadCardProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleUpload() {
    if (!file) {
      setMessage({ type: "error", text: "Please select a file" });
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("month", String(month));
      formData.append("year", String(year));
      const res = await fetch("/api/schedule/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.message ?? json.error ?? "Upload failed" });
        return;
      }
      setMessage({
        type: "success",
        text: `Uploaded: ${json.data?.tripCount ?? 0} trips, ${json.data?.legCount ?? 0} flights.`,
      });
      setFile(null);
      router.refresh();
      onUploadSuccess?.();
    } catch (e) {
      setMessage({ type: "error", text: "Upload failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crew Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-500">
          Upload your monthly Line schedule (.txt or .pdf). We&apos;ll parse trips and flights and show them on your calendar.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">File</span>
            <input
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
              className="block w-full text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white file:bg-[#1E6FB9] file:text-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Month</span>
            <select
              className="h-11 text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Year</span>
            <select
              className="h-11 text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={handleUpload}
            disabled={loading || !file}
            className="gap-2"
            style={{ backgroundColor: PRIMARY }}
          >
            <Upload className="h-4 w-4" />
            {loading ? "Uploading…" : "Upload Line Schedule"}
          </Button>
        </div>
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";
import type { getTranslator } from "@/i18n/getTranslator";

const PRIMARY = "#1E6FB9";

type T = ReturnType<typeof getTranslator>;

interface ScheduleUploadCardProps {
  t: T;
  onUploadSuccess?: () => void;
  onShowScheduleGuide?: () => void;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export function ScheduleUploadCard({ t, onUploadSuccess, onShowScheduleGuide }: ScheduleUploadCardProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleUpload() {
    if (!file) {
      setMessage({ type: "error", text: t("dashboard.scheduleUploadFileHint") });
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/schedule/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = json.errorCode as string | undefined;
        const base =
          code === "UNSUPPORTED_PDF_FORMAT"
            ? `${t("dashboard.scheduleErrUnsupportedTitle")}\n${t("dashboard.scheduleErrUnsupportedHelp")}`
            : (json.message ?? json.error ?? "Upload failed");
        setMessage({ type: "error", text: base });
        return;
      }
      const d = json.data ?? {};
      const fmt = t("dashboard.scheduleFormatLine");
      const parts: string[] = [
        t("dashboard.scheduleUploadSuccess"),
        `${t("dashboard.scheduleUploadFormatLabel")}: ${fmt}`,
        [
          interpolate(t("dashboard.scheduleUploadStatsTrips"), { n: d.tripCount ?? 0 }),
          interpolate(t("dashboard.scheduleUploadStatsLegs"), { n: d.legCount ?? 0 }),
        ].join(", "),
      ];
      if (d.layoverTripCount > 0) {
        parts.push(interpolate(t("dashboard.scheduleUploadStatsLayoverTrips"), { n: d.layoverTripCount }));
      }
      if (d.reserveDayCount > 0) {
        parts.push(interpolate(t("dashboard.scheduleUploadStatsReserve"), { n: d.reserveDayCount }));
      }
      if (d.mandatoryOffCount > 0) {
        parts.push(interpolate(t("dashboard.scheduleUploadStatsMandatoryOff"), { n: d.mandatoryOffCount }));
      }
      if (d.deadHeadLegCount > 0) {
        parts.push(interpolate(t("dashboard.scheduleUploadStatsDeadhead"), { n: d.deadHeadLegCount }));
      }
      setMessage({
        type: "success",
        text: parts.join("\n"),
      });
      setFile(null);
      router.refresh();
      onUploadSuccess?.();
    } catch {
      setMessage({ type: "error", text: "Upload failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.scheduleUploadCardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-muted">{t("dashboard.scheduleUploadFileHint")}</p>
          {onShowScheduleGuide && (
            <button
              type="button"
              onClick={onShowScheduleGuide}
              className="block text-start text-xs font-medium text-[#1E6FB9] underline decoration-[#1E6FB9]/40 underline-offset-2 hover:decoration-[#1E6FB9]"
            >
              {t("dashboard.scheduleUploadWherePdfLink")}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">File</span>
            <input
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
              className="block w-full text-content bg-surface border border-line rounded-lg px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white file:bg-[#1E6FB9] file:text-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button
            onClick={handleUpload}
            disabled={loading || !file}
            className="gap-2"
            style={{ backgroundColor: PRIMARY }}
          >
            <Upload className="h-4 w-4" />
            {loading ? t("dashboard.scheduleUploading") : t("dashboard.scheduleUploadButton")}
          </Button>
        </div>
        {message && (
          <p
            className={`text-sm whitespace-pre-line ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

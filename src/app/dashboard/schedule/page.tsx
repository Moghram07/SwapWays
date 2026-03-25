import { SchedulePageClient } from "./SchedulePageClient";

export default function SchedulePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Crew Schedule</h1>
        <p className="mt-2 text-slate-600">
          Upload your Line schedule and view your flights on the calendar.
        </p>
      </div>

      <SchedulePageClient />
    </div>
  );
}

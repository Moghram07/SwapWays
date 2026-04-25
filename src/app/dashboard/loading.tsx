export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 md:p-0" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
    </div>
  );
}

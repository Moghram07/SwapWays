export default function Loading() {
  return (
    <div className="animate-pulse space-y-8">
      <div>
        <div className="mb-2 h-8 w-44 rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 h-10 w-full rounded bg-slate-100" />
        <div className="mb-4 h-10 w-full rounded bg-slate-100" />
        <div className="h-64 w-full rounded bg-slate-50" />
      </div>
    </div>
  );
}

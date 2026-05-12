export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-32 rounded bg-slate-200" />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-4 w-28 rounded bg-slate-100" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 h-4 w-full rounded bg-slate-100" />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        <div className="h-5 w-36 rounded bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

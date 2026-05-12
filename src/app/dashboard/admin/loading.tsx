export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-28 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="h-7 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

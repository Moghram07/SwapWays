export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded bg-slate-200" />
        <div className="h-9 w-28 rounded-lg bg-slate-100" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 h-10 w-full rounded bg-slate-100" />
        <div className="h-10 w-full rounded bg-slate-100" />
      </div>

      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-4 w-20 rounded bg-slate-100" />
          </div>
          <div className="mb-2 h-4 w-full rounded bg-slate-100" />
          <div className="mb-2 h-4 w-5/6 rounded bg-slate-100" />
          <div className="h-4 w-2/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

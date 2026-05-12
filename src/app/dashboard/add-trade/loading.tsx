export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-10 w-full rounded-lg bg-slate-100" />
          </div>
        ))}
        <div className="h-10 w-32 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

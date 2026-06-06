export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-32 rounded bg-surface-2" />
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-surface-2" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-surface-2" />
            <div className="h-4 w-28 rounded bg-surface-2" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 h-4 w-full rounded bg-surface-2" />
        ))}
      </div>
      <div className="rounded-xl border border-line bg-surface p-6 space-y-3">
        <div className="h-5 w-36 rounded bg-surface-2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full rounded bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 rounded bg-surface-2" />
      <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 rounded bg-surface-2" />
            <div className="h-10 w-full rounded-lg bg-surface-2" />
          </div>
        ))}
        <div className="h-10 w-32 rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}

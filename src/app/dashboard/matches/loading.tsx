export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 rounded bg-surface-2" />

      <div className="flex gap-2">
        <div className="h-10 w-28 rounded-lg bg-surface-2" />
        <div className="h-10 w-32 rounded-lg bg-surface-2" />
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-5 w-44 rounded bg-surface-2" />
            <div className="h-4 w-24 rounded bg-surface-2" />
          </div>
          <div className="mb-2 h-4 w-full rounded bg-surface-2" />
          <div className="mb-2 h-4 w-5/6 rounded bg-surface-2" />
          <div className="h-4 w-2/3 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

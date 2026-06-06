export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-36 rounded bg-surface-2" />
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border border-line bg-surface">
        <div className="w-80 border-r border-line p-3">
          <div className="mb-3 h-4 w-28 rounded bg-surface-2" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-line p-3">
                <div className="mb-2 h-4 w-2/3 rounded bg-surface-2" />
                <div className="h-3 w-full rounded bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="mb-4 h-6 w-40 rounded bg-surface-2" />
          <div className="space-y-3">
            <div className="h-12 w-3/5 rounded-lg bg-surface-2" />
            <div className="h-12 w-2/5 rounded-lg bg-surface-2" />
            <div className="h-12 w-3/4 rounded-lg bg-surface-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

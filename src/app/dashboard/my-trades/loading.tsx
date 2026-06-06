export default function Loading() {
  return (
    <div className="animate-pulse space-y-8">
      <div>
        <div className="mb-2 h-8 w-48 rounded bg-surface-2" />
        <div className="h-4 w-32 rounded bg-surface-2" />
      </div>

      <section className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-6 w-20 rounded-full bg-surface-2" />
              <div className="h-5 w-48 rounded bg-surface-2" />
            </div>
            <div className="mb-2 h-4 w-full rounded bg-surface-2" />
            <div className="mb-2 h-4 w-3/4 rounded bg-surface-2" />
            <div className="h-4 w-1/2 rounded bg-surface-2" />
          </div>
        ))}
      </section>
    </div>
  );
}

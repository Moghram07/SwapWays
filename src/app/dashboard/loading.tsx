export default function Loading() {
  return (
    <div className="animate-pulse space-y-10">
      <div>
        <div className="mb-3 h-8 w-72 rounded bg-slate-200" />
        <div className="h-4 w-64 rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-2 h-7 w-16 rounded bg-slate-200" />
            <div className="h-4 w-28 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <section key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 h-6 w-40 rounded bg-slate-200" />
            <div className="space-y-3">
              <div className="h-14 w-full rounded-xl bg-slate-100" />
              <div className="h-14 w-full rounded-xl bg-slate-100" />
              <div className="h-14 w-full rounded-xl bg-slate-100" />
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-3 h-6 w-32 rounded bg-slate-200" />
        <div className="h-10 w-44 rounded-lg bg-slate-100" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 h-6 w-36 rounded bg-slate-200" />
        <div className="space-y-3">
          <div className="h-14 w-full rounded-xl bg-slate-100" />
          <div className="h-14 w-full rounded-xl bg-slate-100" />
        </div>
      </section>
    </div>
  );
}

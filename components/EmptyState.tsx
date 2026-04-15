export function EmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Start with an address
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Find schools near home by commute.
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Enter a San Francisco address to view nearby school options, mock
          commute times, and a preview of the future map experience.
        </p>
      </div>
    </section>
  );
}

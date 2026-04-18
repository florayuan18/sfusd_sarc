type PageHeaderProps = {
  hasSearched: boolean;
  address: string;
};

export function PageHeader({ hasSearched, address }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          SARC Navigator
        </p>
        <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-[2.8rem]">
          Explore school options by everyday commute.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-6 text-slate-600">
          A planning workspace for families comparing nearby San Francisco
          schools with clear commute information.
        </p>
      </div>

      {hasSearched ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Showing results near{" "}
          <span className="font-semibold text-slate-950">
            {address || "San Francisco"}
          </span>
        </div>
      ) : null}
    </header>
  );
}

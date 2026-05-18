export function ProductGridSkeleton({ cards = 6 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="panel overflow-hidden">
          <div className="h-44 animate-pulse bg-slate-100" />
          <div className="space-y-4 px-5 py-5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-100" />
            <div className="space-y-2">
              <div className="h-3 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="flex items-end justify-between pt-2">
              <div className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded-full bg-slate-100" />
                <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="h-11 w-28 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

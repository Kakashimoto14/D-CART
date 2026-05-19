export function ProductGridSkeleton({ cards = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[16px] border border-white/80 bg-white shadow-card">
          <div className="h-28 animate-pulse bg-brand-50 sm:h-32" />
          <div className="space-y-3 px-3 py-3">
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-100" />
            <div className="flex items-end justify-between pt-2">
              <div className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded-full bg-slate-100" />
                <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="h-9 w-14 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

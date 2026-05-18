export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, total } = pagination;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>{" "}
        ({total} total)
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
        >
          ← Prev
        </button>

        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="btn-secondary px-3 py-2 text-sm"
            >
              1
            </button>
            {start > 2 && <span className="px-1 text-slate-400">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
              p === page
                ? "bg-brand-600 text-white"
                : "btn-secondary"
            }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="btn-secondary px-3 py-2 text-sm"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

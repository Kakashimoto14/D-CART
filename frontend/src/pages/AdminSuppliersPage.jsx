import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/adminApi";
import { FilterToolbar, PageHero, SectionCard, StatCard } from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime } from "../utils/format";

export function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const loadData = useCallback(async () => {
    try {
      setError("");
      setSuppliers(await adminApi.suppliers({ q: query, status }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load suppliers."));
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 250);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const totals = useMemo(
    () => ({
      suppliers: suppliers.length,
      products: suppliers.reduce((sum, supplier) => sum + supplier.suppliedProducts.length, 0),
      batches: suppliers.reduce((sum, supplier) => sum + supplier.batchCount, 0),
      active: suppliers.filter((supplier) => supplier.status === "ACTIVE").length
    }),
    [suppliers]
  );

  if (loading) return <LoadingState label="Loading supplier records..." />;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Suppliers"
        title="Supplier visibility"
        description="Supplier records are derived from received inventory batches because this database does not include a dedicated supplier table yet."
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Suppliers" value={totals.suppliers} />
        <StatCard label="Supplied products" value={totals.products} />
        <StatCard label="Received batches" value={totals.batches} />
        <StatCard label="Active suppliers" value={totals.active} tone={totals.active ? "success" : "default"} />
      </div>

      <SectionCard title="Supplier list" description="Use supplier names captured during inventory receiving.">
        <div className="space-y-5">
          <FilterToolbar searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search supplier names">
            <select className="field min-w-[170px]" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </FilterToolbar>

          <div className="grid gap-4 lg:grid-cols-2">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{supplier.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Last received {formatDateTime(supplier.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={supplier.status} />
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                  <span>{supplier.batchCount} batches</span>
                  <span>{supplier.receivedQty} received</span>
                  <span>{supplier.remainingQty} remaining</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {supplier.suppliedProducts.slice(0, 8).map((product) => (
                    <span key={product.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {product.name}
                    </span>
                  ))}
                  {supplier.suppliedProducts.length === 0 ? (
                    <span className="text-sm text-slate-500">No linked products.</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {suppliers.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No supplier names have been captured from inventory receiving yet.
            </p>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

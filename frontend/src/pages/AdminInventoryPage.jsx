import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryApi } from "../api/categoryApi";
import { inventoryApi } from "../api/inventoryApi";
import { productApi } from "../api/productApi";
import {
  FilterToolbar,
  FormSection,
  HealthMeter,
  PageHero,
  SectionCard,
  StatCard
} from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { formatDateTime } from "../utils/format";

const initialReceiveForm = {
  productId: "",
  quantity: "",
  supplier: "",
  expiresAt: ""
};

export function AdminInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], nearExpiry: [] });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [receiveForm, setReceiveForm] = useState(initialReceiveForm);
  const [receivingStock, setReceivingStock] = useState(false);
  const [cleaningReservations, setCleaningReservations] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [inventoryResult, alertResult, productResult, categoryResult] = await Promise.all([
        inventoryApi.list(),
        inventoryApi.alerts(),
        productApi.list(),
        categoryApi.list()
      ]);

      setInventory(inventoryResult.inventory || []);
      setAlerts(alertResult);
      setProducts(productResult.products);
      setCategories(categoryResult);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredInventory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchesQuery = !normalizedQuery
        || [item.product?.name, item.product?.barcode || "", item.product?.category?.name || ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory =
        selectedCategory === "ALL" || String(item.product?.categoryId || "") === selectedCategory;

      return matchesQuery && matchesCategory;
    });
  }, [inventory, query, selectedCategory]);

  const handleReceiveStock = async (event) => {
    event.preventDefault();
    setReceivingStock(true);
    setError("");
    setSuccess("");

    try {
      await inventoryApi.receiveStock(Number(receiveForm.productId), {
        quantity: Number(receiveForm.quantity),
        supplier: receiveForm.supplier || null,
        expiresAt: receiveForm.expiresAt ? new Date(receiveForm.expiresAt).toISOString() : null
      });
      setReceiveForm(initialReceiveForm);
      setSuccess("Stock received successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to receive stock.");
    } finally {
      setReceivingStock(false);
    }
  };

  const handleCleanup = async () => {
    setCleaningReservations(true);
    setError("");
    setSuccess("");

    try {
      const cleanup = await inventoryApi.cleanupExpiredReservations();
      setSuccess(
        cleanup.cleanedCount > 0
          ? `Released ${cleanup.cleanedCount} expired reservation(s).`
          : "No expired reservations needed cleanup."
      );
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to clean up expired reservations.");
    } finally {
      setCleaningReservations(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading inventory controls..." />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Inventory"
        title="Live stock health"
        description="Monitor available stock, reserved holds, batch freshness, and cleanup actions from one operational screen."
        actions={
          <button type="button" className="btn-secondary px-5 py-3" onClick={handleCleanup} disabled={cleaningReservations}>
            {cleaningReservations ? "Cleaning..." : "Release overdue holds"}
          </button>
        }
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Inventory SKUs" value={inventory.length} />
        <StatCard label="Low-stock items" value={alerts.lowStock.length} tone={alerts.lowStock.length ? "danger" : "default"} />
        <StatCard label="Near-expiry items" value={alerts.nearExpiry.length} tone={alerts.nearExpiry.length ? "warning" : "default"} />
        <StatCard
          label="Reserved units"
          value={inventory.reduce((sum, item) => sum + (item.reservedQty || 0), 0)}
          hint="Held in active checkout reservations"
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Inventory board" description="Search, filter, and scan current stock health.">
          <div className="space-y-5">
            <FilterToolbar
              searchValue={query}
              onSearchChange={setQuery}
              searchPlaceholder="Search by product, barcode, or category"
            >
              <select
                className="field min-w-[180px]"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="ALL">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FilterToolbar>

            <div className="space-y-3">
              {filteredInventory.map((item) => {
                const nextBatch = item.batches.find((batch) => batch.remainingQty > 0) || item.batches[0];
                const tone = item.isLowStock ? "danger" : item.batches.some((batch) => batch.isNearExpiry) ? "warning" : "success";
                return (
                  <div key={item.productId} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-slate-900">{item.product?.name}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {item.product?.category?.name || "Uncategorized"}
                          </span>
                          {item.isLowStock ? <StatusBadge status="LOW_STOCK" /> : null}
                        </div>
                        <div className="mt-3 grid gap-3 text-sm text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                          <span>Available: {item.availableQty}</span>
                          <span>Reserved: {item.reservedQty}</span>
                          <span>Low stock threshold: {item.lowStockThreshold}</span>
                          <span>Barcode: {item.product?.barcode || "N/A"}</span>
                        </div>
                        <div className="mt-4 space-y-3">
                          <HealthMeter
                            label="Sellable stock"
                            value={item.availableQty}
                            total={Math.max(item.availableQty + item.reservedQty, item.lowStockThreshold || 1)}
                            tone={tone}
                          />
                          {nextBatch ? (
                            <div className="rounded-[18px] bg-white/90 p-4 text-sm text-slate-500">
                              <p className="font-semibold text-slate-800">Next batch</p>
                              <p className="mt-2">
                                {nextBatch.batchCode} {nextBatch.supplier ? `- ${nextBatch.supplier}` : ""}
                              </p>
                              <p className="mt-1">
                                Expires {nextBatch.expiresAt ? formatDateTime(nextBatch.expiresAt) : "No expiry set"}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredInventory.length === 0 ? (
                <p className="rounded-[20px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  No inventory records match your filters.
                </p>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Receive stock" description="Capture newly received goods with batch-ready details.">
            <form onSubmit={handleReceiveStock} className="space-y-4">
              <FormSection title="Receiving details">
                <div className="grid gap-4">
                  <select
                    className="field"
                    value={receiveForm.productId}
                    onChange={(event) =>
                      setReceiveForm((current) => ({ ...current, productId: event.target.value }))
                    }
                    required
                  >
                    <option value="">Choose product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Quantity received"
                    value={receiveForm.quantity}
                    onChange={(event) =>
                      setReceiveForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    required
                  />
                  <input
                    className="field"
                    placeholder="Supplier name"
                    value={receiveForm.supplier}
                    onChange={(event) =>
                      setReceiveForm((current) => ({ ...current, supplier: event.target.value }))
                    }
                  />
                  <input
                    className="field"
                    type="datetime-local"
                    value={receiveForm.expiresAt}
                    onChange={(event) =>
                      setReceiveForm((current) => ({ ...current, expiresAt: event.target.value }))
                    }
                  />
                </div>
              </FormSection>
              <button type="submit" className="btn-primary px-5 py-3" disabled={receivingStock}>
                {receivingStock ? "Receiving..." : "Receive stock"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Alert queues" description="Items that need attention from the stock team.">
            <div className="space-y-4">
              <div className="rounded-[20px] bg-rose-50 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-700">Low stock</p>
                <div className="mt-3 space-y-3">
                  {alerts.lowStock.slice(0, 5).map((item) => (
                    <div key={item.productId} className="rounded-2xl bg-white p-4">
                      <p className="font-semibold text-slate-900">{item.product?.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Available {item.availableQty} - Threshold {item.lowStockThreshold}
                      </p>
                    </div>
                  ))}
                  {alerts.lowStock.length === 0 ? <p className="text-sm text-rose-700">No low-stock items right now.</p> : null}
                </div>
              </div>

              <div className="rounded-[20px] bg-amber-50 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Near expiry</p>
                <div className="mt-3 space-y-3">
                  {alerts.nearExpiry.slice(0, 5).map((item) => {
                    const nextBatch = item.batches.find((batch) => batch.isNearExpiry);
                    return (
                      <div key={item.productId} className="rounded-2xl bg-white p-4">
                        <p className="font-semibold text-slate-900">{item.product?.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {nextBatch?.batchCode || "Batch"} expires{" "}
                          {nextBatch?.expiresAt ? formatDateTime(nextBatch.expiresAt) : "soon"}
                        </p>
                      </div>
                    );
                  })}
                  {alerts.nearExpiry.length === 0 ? <p className="text-sm text-amber-700">No near-expiry batches right now.</p> : null}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

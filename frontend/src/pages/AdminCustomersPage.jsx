import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/adminApi";
import { FilterToolbar, PageHero, SectionCard, StatCard } from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { getApiErrorMessage } from "../utils/apiError";
import { currency, formatDateTime } from "../utils/format";

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const loadData = useCallback(async () => {
    try {
      setError("");
      setCustomers(await adminApi.customers({ q: query, status }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load customers."));
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
      customers: customers.length,
      orders: customers.reduce((sum, customer) => sum + customer.totalOrders, 0),
      spent: customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
      active: customers.filter((customer) => customer.status === "ACTIVE").length
    }),
    [customers]
  );

  if (loading) return <LoadingState label="Loading customer records..." />;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Customers"
        title="Customer operations"
        description="Derived from real customer accounts and order history so the team can see value, activity, and recent demand."
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={totals.customers} />
        <StatCard label="Total orders" value={totals.orders} />
        <StatCard label="Completed spend" value={currency(totals.spent)} />
        <StatCard label="Active now" value={totals.active} tone={totals.active ? "success" : "default"} />
      </div>

      <SectionCard title="Customer list" description="Search by name, email, or phone and filter by order activity.">
        <div className="space-y-5">
          <FilterToolbar searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search customers">
            <select className="field min-w-[170px]" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RETURNING">Returning</option>
              <option value="NEW">New</option>
            </select>
          </FilterToolbar>

          <div className="overflow-x-auto rounded-[22px] border border-slate-100">
            <table className="min-w-[820px] w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Total spent</th>
                  <th className="px-4 py-3">Last order</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-4 font-semibold text-slate-900">{customer.name}</td>
                    <td className="px-4 py-4 text-slate-500">
                      <div>{customer.email}</div>
                      <div>{customer.phone || "No phone recorded"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{customer.totalOrders}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{currency(customer.totalSpent)}</td>
                    <td className="px-4 py-4 text-slate-500">
                      {customer.lastOrderDate ? formatDateTime(customer.lastOrderDate) : "No orders yet"}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={customer.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 ? (
              <p className="bg-white px-4 py-10 text-center text-sm text-slate-500">No customers match the current filters.</p>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { adminApi } from "../api/adminApi";
import { PageHero, SectionCard, StatCard } from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { getApiErrorMessage } from "../utils/apiError";
import { currency } from "../utils/format";

export function AdminSalesAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");
      setAnalytics(await adminApi.analytics({ range }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load sales analytics."));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingState label="Loading sales analytics..." />;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Analytics"
        title="Sales analytics"
        description="Revenue, order volume, payment mix, product movement, and fulfillment status based on real order records."
        actions={
          <select className="field min-w-[170px]" value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        }
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={currency(analytics?.totals?.revenue || 0)} />
        <StatCard label="Orders" value={analytics?.totals?.orders || 0} />
        <StatCard label="Average order" value={currency(analytics?.totals?.averageOrderValue || 0)} />
        <StatCard label="Top products" value={analytics?.topSellingProducts?.length || 0} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Sales by day" description="Daily revenue and order rhythm for the selected range.">
          <div className="h-80 rounded-[20px] bg-slate-50/80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.salesByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4df" />
                <XAxis dataKey="date" stroke="#6b7280" tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => (name === "revenue" ? currency(value) : value)} />
                <Bar dataKey="revenue" fill="#2a9978" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Top-selling products" description="Ranked by fulfilled or requested quantity.">
          <div className="space-y-3">
            {(analytics?.topSellingProducts || []).map((product) => (
              <div key={product.productId} className="rounded-[18px] bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{product.category || "Uncategorized"}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-700">{product.quantity} units</span>
                </div>
              </div>
            ))}
            {(analytics?.topSellingProducts || []).length === 0 ? (
              <p className="text-sm text-slate-500">No sales movement in this range.</p>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Payment methods" description="Order count and revenue by tender type.">
          <div className="space-y-3">
            {(analytics?.paymentBreakdown || []).map((item) => (
              <div key={item.paymentMethod} className="flex items-center justify-between rounded-[18px] bg-slate-50/80 p-4">
                <StatusBadge status={item.paymentMethod} />
                <span className="text-sm text-slate-600">{item.orders} orders</span>
                <span className="font-semibold text-slate-900">{currency(item.revenue)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Order statuses" description="Current operational spread for this range.">
          <div className="space-y-3">
            {(analytics?.orderStatusBreakdown || []).map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-[18px] bg-slate-50/80 p-4">
                <StatusBadge status={item.status} />
                <span className="font-semibold text-slate-900">{item.orders}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

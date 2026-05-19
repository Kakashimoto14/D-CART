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
import { BrandLogo } from "../components/brand/BrandLogo.jsx";
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

  const exportCsv = () => {
    if (!analytics) return;

    const rows = [
      ["Report", "D'Cart Sales Report"],
      ["Range", range],
      ["Revenue", analytics.totals?.revenue || 0],
      ["Orders", analytics.totals?.orders || 0],
      [],
      ["Date", "Revenue", "Orders"],
      ...(analytics.salesByDay || []).map((item) => [item.date, item.revenue, item.orders]),
      [],
      ["Top Product", "Category", "Quantity"],
      ...(analytics.topSellingProducts || []).map((item) => [item.name, item.category || "", item.quantity]),
      [],
      ["Payment Method", "Orders", "Revenue"],
      ...(analytics.paymentBreakdown || []).map((item) => [item.paymentMethod, item.orders, item.revenue]),
      [],
      ["Order Status", "Orders"],
      ...(analytics.orderStatusBreakdown || []).map((item) => [item.status, item.orders])
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dcart-sales-report-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) return <LoadingState label="Loading sales analytics..." />;

  return (
    <div className="report-page space-y-6">
      <div className="hidden print:block print-avoid-break">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <BrandLogo className="h-12 w-44" imageClassName="h-10" />
          <div className="text-right">
            <h1 className="text-xl font-bold text-slate-950">Sales Report</h1>
            <p className="mt-1 text-xs text-slate-600">
              Range: {range} | Generated: {new Date().toLocaleString("en-PH")}
            </p>
          </div>
        </div>
      </div>
      <PageHero
        eyebrow="Analytics"
        title="Sales analytics"
        description="Revenue, order volume, payment mix, product movement, and fulfillment status based on real order records."
        actions={
          <>
            <select className="field min-w-[170px]" value={range} onChange={(event) => setRange(event.target.value)}>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button type="button" className="btn-secondary px-4 py-3" onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="btn-primary px-4 py-3" onClick={printReport}>
              Print report
            </button>
          </>
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
          <div className="min-h-72 h-80 rounded-[20px] bg-[#fff6ee] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.salesByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eaded5" />
                <XAxis dataKey="date" stroke="#6b7280" tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => (name === "revenue" ? currency(value) : value)} />
                <Bar dataKey="revenue" fill="#FF6B4A" radius={[8, 8, 0, 0]} />
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
                  <span className="text-sm font-bold text-brand-600">{product.quantity} units</span>
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

      <SectionCard title="Report table" description="Printable report rows for sales, payments, and order statuses.">
        <div className="overflow-x-auto rounded-[20px] border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(analytics?.topSellingProducts || []).map((item) => (
                <tr key={`product-${item.productId}`}>
                  <td className="px-4 py-3">Product performance</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.category || "Uncategorized"}</td>
                  <td className="px-4 py-3">{item.quantity} units</td>
                </tr>
              ))}
              {(analytics?.paymentBreakdown || []).map((item) => (
                <tr key={`payment-${item.paymentMethod}`}>
                  <td className="px-4 py-3">Payment methods</td>
                  <td className="px-4 py-3">{item.paymentMethod}</td>
                  <td className="px-4 py-3">{item.orders} orders</td>
                  <td className="px-4 py-3">{currency(item.revenue)}</td>
                </tr>
              ))}
              {(analytics?.orderStatusBreakdown || []).map((item) => (
                <tr key={`status-${item.status}`}>
                  <td className="px-4 py-3">Order statuses</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">Orders</td>
                  <td className="px-4 py-3">{item.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

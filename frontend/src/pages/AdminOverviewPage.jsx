import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  CheckCheck,
  Package,
  ShoppingBag
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { adminApi } from "../api/adminApi";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import {
  PageHero,
  SectionCard,
  StatCard
} from "../components/admin/AdminPrimitives.jsx";
import { currency, formatDateTime } from "../utils/format";
import { getApiErrorMessage } from "../utils/apiError";

export function AdminOverviewPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");
      const data = await adminApi.dashboard();
      setDashboard(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const orderMix = useMemo(
    () => [
      { name: "Delivered", value: dashboard?.totals?.delivered || 0 },
      { name: "Pending", value: dashboard?.totals?.pendingOrders || 0 },
      { name: "Refunds", value: dashboard?.totals?.pendingRefunds || 0 }
    ],
    [dashboard]
  );

  const analyticsSeries = useMemo(
    () => [
      { label: "AOV", value: dashboard?.analytics?.averageOrderValue || 0 },
      { label: "Fulfillment", value: dashboard?.analytics?.fulfillmentRate || 0 },
      { label: "Cancellation", value: dashboard?.analytics?.cancellationRate || 0 },
      { label: "Refunded", value: dashboard?.analytics?.refundedAmount || 0 }
    ],
    [dashboard]
  );

  if (loading) {
    return <LoadingState label="Loading operations overview..." />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Admin"
        title="Store Operations Command Center"
        description="Track sales, stock pressure, fulfillment velocity, dispatch readiness, and communication health from one clean operations view."
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={currency(dashboard?.totals?.sales || 0)}
          hint={`${dashboard?.totals?.orders || 0} total orders`}
          icon={BadgeDollarSign}
        />
        <StatCard
          label="Delivered today"
          value={dashboard?.totals?.deliveredToday || 0}
          hint={`${dashboard?.totals?.delivered || 0} all-time delivered`}
          tone="success"
          icon={CheckCheck}
        />
        <StatCard
          label="Low-stock alerts"
          value={dashboard?.totals?.lowStockAlerts || 0}
          hint={`${dashboard?.totals?.nearExpiryAlerts || 0} near expiry`}
          tone={(dashboard?.totals?.lowStockAlerts || 0) > 0 ? "danger" : "default"}
          icon={AlertTriangle}
        />
        <StatCard
          label="Pending deliveries"
          value={dashboard?.totals?.overdueReservations || 0}
          hint="Orders or stock holds that need attention"
          tone={(dashboard?.totals?.overdueReservations || 0) > 0 ? "warning" : "default"}
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Performance snapshot"
          description="A compact view of commercial and operational balance."
        >
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-72 rounded-[22px] bg-slate-50/80 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsSeries}>
                  <defs>
                    <linearGradient id="overviewTrend" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#2a9978" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="#2a9978" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4df" />
                  <XAxis dataKey="label" stroke="#6b7280" tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#1e7d62"
                    fill="url(#overviewTrend)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72 rounded-[22px] bg-slate-50/80 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={86}
                    paddingAngle={4}
                    fill="#2a9978"
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">AOV</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {currency(dashboard?.analytics?.averageOrderValue || 0)}
              </p>
            </div>
            <div className="rounded-[20px] bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Fulfillment</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard?.analytics?.fulfillmentRate || 0}%
              </p>
            </div>
            <div className="rounded-[20px] bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Order to door</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard?.analytics?.averageCompletionMinutes || 0} min
              </p>
            </div>
            <div className="rounded-[20px] bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Refunded</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {currency(dashboard?.analytics?.refundedAmount || 0)}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Operations support" description="Background processing and customer communication health.">
          <div className="space-y-4">
            <div className="rounded-[20px] bg-slate-50/80 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Redis</p>
                <StatusBadge status={String(dashboard?.runtime?.redisStatus || "disabled").toUpperCase()} />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {dashboard?.runtime?.redisEnabled
                  ? "Background jobs are enabled for realtime operational support."
                  : "Background jobs are running in simple mode. Customer checkout still works, but automated retries may be limited."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Queue waiting" value={dashboard?.runtime?.queueTotals?.waiting || 0} icon={Boxes} />
              <StatCard label="Queue failed" value={dashboard?.runtime?.queueTotals?.failed || 0} tone="warning" icon={Package} />
            </div>
            <div className="rounded-[20px] bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-slate-900">Notifications in last 24 hours</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-slate-500">Sent</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {dashboard?.notifications?.last24Hours?.sent || 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-slate-500">Failed</p>
                  <p className="mt-2 text-2xl font-bold text-rose-700">
                    {dashboard?.notifications?.last24Hours?.failed || 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-slate-500">Skipped</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">
                    {dashboard?.notifications?.last24Hours?.skipped || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Top movers" description="High-volume products by fulfilled quantity.">
          <div className="space-y-3">
            {(dashboard?.topSellingProducts || []).map((product) => (
              <div key={product.productId} className="rounded-[20px] border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.fulfilledQty} units fulfilled
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-brand-700">
                    {product.requestedQty} requested
                  </p>
                </div>
              </div>
            ))}
            {(dashboard?.topSellingProducts || []).length === 0 ? (
              <p className="text-sm text-slate-500">No product movement data yet.</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Recent operational trail" description="Recent orders and admin recovery actions.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500">Recent orders</h3>
              {(dashboard?.recentOrders || []).map((order) => (
                <div key={order.id} className="rounded-[20px] border border-slate-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">Order #{order.id}</p>
                      <p className="mt-1 text-sm text-slate-500">{order.customer?.name || "Guest customer"}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
              {(dashboard?.recentOrders || []).length === 0 ? (
                <p className="text-sm text-slate-500">No recent orders available.</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500">Audit feed</h3>
              {(dashboard?.audit?.recentLogs || []).slice(0, 6).map((log) => (
                <div key={log.id} className="rounded-[20px] border border-slate-100 bg-slate-50/70 p-4">
                  <p className="font-semibold text-slate-900">{log.action}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {log.actor?.name || "System"} on {log.entityType} #{log.entityId}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
              ))}
              {(dashboard?.audit?.recentLogs || []).length === 0 ? (
                <p className="text-sm text-slate-500">Audit entries will appear here as admin actions are completed.</p>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

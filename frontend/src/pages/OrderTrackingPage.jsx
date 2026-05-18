import { ReceiptText, ShoppingBag, Truck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { orderApi } from "../api/orderApi";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingState } from "../components/common/LoadingState.jsx";
import { StatusBadge } from "../components/common/StatusBadge.jsx";
import { OrderTimeline } from "../components/customer/OrderTimeline.jsx";
import { useOrderRealtime } from "../hooks/useOrderRealtime.js";
import { currency, formatDateTime } from "../utils/format.js";

const paymentLabel = (order) =>
  order?.paymentMethod === "GCASH" ? "GCash via PayMongo" : "Cash on Delivery";

const slotLabel = (slot) => {
  if (!slot) {
    return "Earliest available";
  }

  return `${slot.startTime} - ${slot.endTime}`;
};

export function OrderTrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveMessage, setLiveMessage] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      const nextOrder = await orderApi.getById(orderId);
      setOrder(nextOrder);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const { isConnected } = useOrderRealtime(
    useCallback(
      async (event) => {
        if (String(event.orderId) !== String(orderId)) {
          return;
        }

        setLiveMessage(`Order #${event.orderId} updated live.`);
        await loadOrder();
      },
      [loadOrder, orderId]
    )
  );

  if (loading) {
    return <LoadingState label="Loading order tracking..." />;
  }

  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        description={error || "We couldn't locate this order right now."}
        action={
          <Link to="/orders" className="btn-primary">
            View my orders
          </Link>
        }
      />
    );
  }

  const latestAssignment = order.delivery?.assignments?.[0] || null;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel bg-[linear-gradient(135deg,#0d1b2a_0%,#2b3137_100%)] px-6 py-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-300">
                Order tracking
              </p>
              <h1 className="mt-2 text-3xl font-bold">Order #{order.id}</h1>
              <p className="mt-3 text-sm text-slate-300">{formatDateTime(order.createdAt)}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Payment</p>
                <p className="mt-1 text-sm text-slate-300">
                  {paymentLabel(order)} • {order.paymentStatus}
                </p>
              </div>
              <Truck className="h-10 w-10 text-brand-300" />
            </div>
            <p className="mt-4 text-sm text-slate-300">
              {liveMessage || `Live updates are ${isConnected ? "connected" : "connecting"} for this order.`}
            </p>
          </div>
        </div>

        <div className="panel px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            Next steps
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">What happens now</h2>
          <OrderTimeline status={order.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="panel px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">Ordered items</p>
                <p className="text-sm text-slate-500">Review what&apos;s in this delivery.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Qty {item.quantity}
                      {item.finalQuantity !== undefined && item.finalQuantity !== item.quantity
                        ? ` • Final ${item.finalQuantity}`
                        : ""}
                    </p>
                    {item.pickStatus === "UNAVAILABLE" ? (
                      <p className="mt-2 text-sm font-medium text-rose-600">
                        Unavailable{item.pickIssueNote ? `: ${item.pickIssueNote}` : ""}
                      </p>
                    ) : null}
                    {item.substituteProduct ? (
                      <p className="mt-2 text-sm font-medium text-amber-700">
                        Substitute: {item.substituteProduct.name}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-semibold text-slate-900">
                    {currency(item.price * (item.finalQuantity ?? item.quantity))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <ReceiptText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">Delivery details</p>
                <p className="text-sm text-slate-500">Address, schedule, and delivery updates.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Address</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {order.delivery?.address || "Awaiting delivery details"}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Schedule</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{slotLabel(order.deliverySlot)}</p>
                {order.delivery?.estimatedAt ? (
                  <p className="mt-2 text-xs text-slate-500">ETA {formatDateTime(order.delivery.estimatedAt)}</p>
                ) : null}
              </div>
            </div>

            {latestAssignment?.rider?.user?.name ? (
              <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  Rider: {latestAssignment.rider.user.name}
                </p>
                <p className="mt-1">Vehicle: {latestAssignment.rider.vehicleType || "Delivery rider"}</p>
                {latestAssignment.rider.lastSeenAt ? (
                  <p className="mt-1">Last update: {formatDateTime(latestAssignment.rider.lastSeenAt)}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="panel px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Summary
            </p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{currency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Delivery fee</span>
                <span>{currency(order.deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{currency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="panel px-6 py-6">
            <p className="text-sm font-semibold text-slate-900">Need something else?</p>
            <div className="mt-4 grid gap-3">
              <Link to="/products" className="btn-primary w-full">
                Continue shopping
              </Link>
              <Link to="/orders" className="btn-secondary w-full">
                View my orders
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

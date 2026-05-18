import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { orderApi } from "../../api/orderApi";

const POLL_INTERVAL_MS = 4000;

const toneClasses = {
  success: {
    eyebrow: "text-emerald-600",
    card: "border-emerald-200 bg-emerald-50/70",
    text: "text-emerald-800"
  },
  warning: {
    eyebrow: "text-amber-600",
    card: "border-amber-200 bg-amber-50/70",
    text: "text-amber-800"
  },
  danger: {
    eyebrow: "text-rose-600",
    card: "border-rose-200 bg-rose-50/70",
    text: "text-rose-800"
  },
  neutral: {
    eyebrow: "text-brand-600",
    card: "border-slate-200 bg-slate-50/70",
    text: "text-slate-700"
  }
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : "Waiting for update";

const buildPresentation = (variant, order) => {
  if (!order) {
    if (variant === "success") {
      return {
        tone: "neutral",
        eyebrow: "Payment submitted",
        title: "Your GCash payment is being confirmed",
        body: "We sent your order to PayMongo. Keep this page open or check your orders while we wait for the payment webhook."
      };
    }

    return {
      tone: "warning",
      eyebrow: "Payment not completed",
      title: "Your GCash checkout was not completed",
      body: "You can return to your orders to confirm whether the payment stayed pending, failed, or expired."
    };
  }

  if (order.paymentStatus === "PAID") {
    return {
      tone: "success",
      eyebrow: "Payment successful",
      title: "Your GCash payment has been confirmed",
      body: `Order #${order.id} is now marked as paid. The team can continue fulfillment without manual confirmation.`
    };
  }

  if (order.paymentStatus === "FAILED") {
    return {
      tone: "danger",
      eyebrow: "Payment failed",
      title: "The GCash payment did not go through",
      body: `Order #${order.id} was closed after PayMongo reported a failed payment. You can create a fresh checkout when you're ready.`
    };
  }

  if (order.paymentStatus === "EXPIRED") {
    return {
      tone: "warning",
      eyebrow: "Payment expired",
      title: "The GCash session expired before payment completed",
      body: `Order #${order.id} was released safely, including its delivery slot and reserved stock. You can place a new checkout anytime.`
    };
  }

  if (variant === "cancelled") {
    return {
      tone: "warning",
      eyebrow: "Payment pending review",
      title: "The browser checkout was cancelled, but the final payment state is still pending",
      body: `Order #${order.id} is still waiting for an authoritative PayMongo update. If you completed payment in another tab, this page will refresh automatically.`
    };
  }

  return {
    tone: "neutral",
    eyebrow: "Payment pending",
    title: "Your payment was submitted and is waiting for confirmation",
    body: `Order #${order.id} will switch to paid as soon as the PayMongo webhook arrives.`
  };
};

export function PaymentResultPanel({ variant }) {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let intervalId = null;

    const loadOrder = async () => {
      try {
        const nextOrder = await orderApi.getById(orderId);
        if (!isMounted) {
          return;
        }

        setOrder(nextOrder);
        setError("");

        if (nextOrder.paymentStatus !== "PENDING" && intervalId) {
          window.clearInterval(intervalId);
        }
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError.response?.data?.message ||
            "Unable to refresh the payment status right now. You can still check your Orders page."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrder();
    intervalId = window.setInterval(loadOrder, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [orderId]);

  const presentation = buildPresentation(variant, order);
  const tone = toneClasses[presentation.tone];

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="panel w-full max-w-2xl px-8 py-10 text-center">
        <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${tone.eyebrow}`}>
          {presentation.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-ink">{presentation.title}</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">{presentation.body}</p>

        <div className={`mt-6 rounded-2xl border px-5 py-4 text-left ${tone.card}`}>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className={tone.text}>
              <strong>Order:</strong> {orderId ? `#${orderId}` : "Unavailable"}
            </p>
            <p className={tone.text}>
              <strong>Payment status:</strong> {order?.paymentStatus || "PENDING"}
            </p>
            <p className={tone.text}>
              <strong>Order status:</strong> {order?.status || "PENDING"}
            </p>
            <p className={tone.text}>
              <strong>Last update:</strong> {formatDateTime(order?.updatedAt)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Refreshing payment status...</p>
        ) : null}
        {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}

        <div className="mt-8 flex justify-center gap-3">
          <Link to={orderId ? `/orders/${orderId}` : "/orders"} className="btn-primary px-5 py-3">
            View order
          </Link>
          <Link to="/products" className="btn-secondary px-5 py-3">
            Continue shopping
          </Link>
        </div>
      </section>
    </div>
  );
}

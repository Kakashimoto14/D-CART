const ORDER_STEPS = [
  { key: "PENDING", label: "Order placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PACKING", label: "Preparing" },
  { key: "READY_FOR_DELIVERY", label: "Ready for delivery" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" }
];

const orderMessages = {
  PENDING: "We received your order and will confirm stock and schedule next.",
  CONFIRMED: "Your basket and delivery details are confirmed.",
  PACKING: "Our team is preparing your groceries now.",
  READY_FOR_DELIVERY: "Your order is packed and queued for dispatch.",
  OUT_FOR_DELIVERY: "Your groceries are on the way.",
  DELIVERED: "Your order has been completed successfully.",
  CANCELLED: "This order was cancelled. If payment was not completed, no delivery will be attempted."
};

export function getOrderStatusMessage(status) {
  return orderMessages[status] || "Your order is being updated.";
}

export function OrderTimeline({ status, compact = false }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {getOrderStatusMessage(status)}
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.findIndex((step) => step.key === status);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-2 md:grid-cols-3"}`}>
        {ORDER_STEPS.map((step, index) => {
          const isDone = currentIndex >= index;
          const isCurrent = currentIndex === index;

          return (
            <div
              key={step.key}
              className={`rounded-[20px] border px-4 py-3 ${
                isDone
                  ? "border-brand-200 bg-brand-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isDone ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                  <p className="text-xs text-slate-500">
                    {isCurrent ? "Current step" : isDone ? "Done" : "Waiting"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-slate-500">{getOrderStatusMessage(status)}</p>
    </div>
  );
}

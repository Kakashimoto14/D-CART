import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  PackageCheck,
  Search,
  Truck,
  UserRound,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/adminApi";
import { dispatchApi } from "../api/dispatchApi";
import { deliverySlotApi } from "../api/deliverySlotApi";
import { fulfillmentApi } from "../api/fulfillmentApi";
import { orderApi } from "../api/orderApi";
import {
  FilterToolbar,
  FormSection,
  PageHero,
  SectionCard,
  StatCard
} from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { currency, formatDateTime } from "../utils/format";

const initialPackingForm = {
  orderId: "",
  stagingLabel: "",
  stagingZone: ""
};

const initialRiderForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  vehicleType: ""
};

const createInitialDeliveryActionForm = () => ({
  recipientName: "",
  proofNote: ""
});

const STANDARD_DELIVERY_SHIFTS = [
  { startTime: "08:00", endTime: "10:00", maxOrders: 5 },
  { startTime: "10:00", endTime: "12:00", maxOrders: 5 },
  { startTime: "13:00", endTime: "15:00", maxOrders: 5 },
  { startTime: "15:00", endTime: "17:00", maxOrders: 5 }
];

const STATUS_LABELS = {
  PENDING: "Pending confirmation",
  CONFIRMED: "Confirmed",
  PACKING: "Preparing / packing",
  READY_FOR_DELIVERY: "Ready for delivery",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
};

const TIMELINE_ACTION_LABELS = {
  "fulfillment.order.packed": "Order packed and staged",
  "fulfillment.order.ready": "Ready for delivery",
  "dispatch.rider.assigned": "Rider assigned",
  "dispatch.started": "Out for delivery",
  "dispatch.completed": "Delivered",
  "dispatch.failed": "Delivery failed"
};

const ORDER_STEPS = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED"
];

const paymentLabel = (order) =>
  order?.paymentMethod === "GCASH" ? "GCash via PayMongo" : "Cash on Delivery";

const openMapsUrl = (delivery) => {
  if (delivery?.latitude && delivery?.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${delivery.latitude},${delivery.longitude}`;
  }

  if (delivery?.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.address)}`;
  }

  return null;
};

function OrderProgress({ status }) {
  const activeIndex = ORDER_STEPS.indexOf(status);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {ORDER_STEPS.map((step, index) => {
        const isDone = activeIndex >= index;
        return (
          <div
            key={step}
            className={`rounded-2xl border px-3 py-3 text-sm ${
              isDone ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Step {index + 1}
            </span>
            <p className="mt-1 font-semibold text-slate-900">{STATUS_LABELS[step]}</p>
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">{value || "Not provided"}</p>
    </div>
  );
}

function OrderDetailDrawer({
  order,
  loading,
  onClose,
  onStatusAction,
  onAssignRider,
  onStartDispatch,
  onCompleteRefund,
  riders,
  busyAction
}) {
  if (!order && !loading) return null;

  const latestAssignment = order?.delivery?.assignments?.[0] || null;
  const mapsUrl = openMapsUrl(order?.delivery);
  const canCancel = order && !["DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 px-0 sm:px-4">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl sm:rounded-l-[28px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="brand-kicker">Order detail</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {loading ? "Loading order..." : `Order #${order.id}`}
            </h2>
          </div>
          <button type="button" className="btn-secondary px-3 py-2" onClick={onClose} aria-label="Close order details">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 px-5 py-8">
            <LoadingState label="Loading order detail..." />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
              {order.refundStatus ? <StatusBadge status={order.refundStatus} /> : null}
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
              <OrderProgress status={order.status} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <DetailRow label="Customer" value={order.customer?.name || "Guest"} />
              <DetailRow label="Contact" value={order.customer?.phone || order.customer?.email} />
              <DetailRow label="Payment" value={`${paymentLabel(order)} - ${order.paymentStatus}`} />
              <DetailRow label="Schedule" value={order.deliverySlot ? `${order.deliverySlot.startTime} - ${order.deliverySlot.endTime}` : "Flexible"} />
              <DetailRow label="ETA" value={order.delivery?.estimatedAt ? formatDateTime(order.delivery.estimatedAt) : "Awaiting dispatch"} />
              <DetailRow label="Rider" value={latestAssignment?.rider?.user?.name || latestAssignment?.rider?.name} />
            </div>

            <div className="mt-4 rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Delivery address</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">
                    {order.delivery?.address || "No delivery address"}
                  </p>
                  {order.delivery?.latitude && order.delivery?.longitude ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Pin: {order.delivery.latitude}, {order.delivery.longitude}
                    </p>
                  ) : null}
                </div>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-3 py-2 text-sm"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open map
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-100 bg-white p-4">
              <p className="text-sm font-bold text-slate-950">Items ordered</p>
              <div className="mt-3 divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{item.product.name}</p>
                      <p className="text-slate-500">Qty {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {currency(item.price * (item.finalQuantity ?? item.quantity))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{currency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery fee</span>
                  <span>{currency(order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-950">
                  <span>Total</span>
                  <span>{currency(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-100 bg-white p-4">
              <p className="text-sm font-bold text-slate-950">Next action</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {order.status === "PENDING" ? (
                  <button type="button" className="btn-primary px-4 py-2" onClick={() => onStatusAction(order, "CONFIRMED")} disabled={busyAction}>
                    Confirm order
                  </button>
                ) : null}
                {order.status === "CONFIRMED" ? (
                  <button type="button" className="btn-primary px-4 py-2" onClick={() => onStatusAction(order, "PACKING")} disabled={busyAction}>
                    Mark preparing
                  </button>
                ) : null}
                {order.status === "PACKING" ? (
                  <button type="button" className="btn-primary px-4 py-2" onClick={() => onStatusAction(order, "READY_FOR_DELIVERY")} disabled={busyAction}>
                    Mark ready for delivery
                  </button>
                ) : null}
                {order.status === "READY_FOR_DELIVERY" && !latestAssignment ? (
                  <select
                    className="field max-w-xs"
                    defaultValue=""
                    onChange={(event) => event.target.value && onAssignRider(order.id, event.target.value)}
                    disabled={busyAction}
                  >
                    <option value="">Assign available rider</option>
                    {riders
                      .filter((rider) => rider.isAvailable)
                      .map((rider) => (
                        <option key={rider.id} value={rider.id}>
                          {rider.name} - {rider.vehicleType}
                        </option>
                      ))}
                  </select>
                ) : null}
                {order.status === "READY_FOR_DELIVERY" && latestAssignment ? (
                  <button type="button" className="btn-primary px-4 py-2" onClick={() => onStartDispatch(order.id)} disabled={busyAction}>
                    Mark out for delivery
                  </button>
                ) : null}
                {order.status === "OUT_FOR_DELIVERY" ? (
                  <button type="button" className="btn-primary px-4 py-2" onClick={() => onStatusAction(order, "DELIVERED")} disabled={busyAction}>
                    Mark delivered
                  </button>
                ) : null}
                {order.refundStatus === "PENDING" ? (
                  <button type="button" className="btn-secondary px-4 py-2" onClick={() => onCompleteRefund(order.id)} disabled={busyAction}>
                    Complete refund
                  </button>
                ) : null}
                {canCancel ? (
                  <button type="button" className="btn-danger px-4 py-2" onClick={() => onStatusAction(order, "CANCELLED")} disabled={busyAction}>
                    Cancel order
                  </button>
                ) : null}
                {["DELIVERED", "CANCELLED"].includes(order.status) && order.refundStatus !== "PENDING" ? (
                  <p className="text-sm text-slate-500">No further action is required for this order.</p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-100 bg-white p-4">
              <p className="text-sm font-bold text-slate-950">Status timeline</p>
              <div className="mt-4 space-y-3">
                {(order.statusHistory || []).length > 0 ? (
                  order.statusHistory.map((event) => (
                    <div key={event.id} className="flex gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {event.oldStatus && event.newStatus && event.oldStatus !== event.newStatus
                            ? `${STATUS_LABELS[event.oldStatus] || event.oldStatus} to ${STATUS_LABELS[event.newStatus] || event.newStatus}`
                            : TIMELINE_ACTION_LABELS[event.action] || STATUS_LABELS[event.newStatus] || event.action}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(event.createdAt)}
                          {event.actor?.name ? ` by ${event.actor.name}` : ""}
                        </p>
                        {event.note ? <p className="mt-1 text-xs text-slate-600">{event.note}</p> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    Status changes will appear here after the next admin action.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminOrdersPage() {
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dispatchBoard, setDispatchBoard] = useState({ riders: [], readyOrders: [], activeAssignments: [] });
  const [deliverySlots, setDeliverySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [packingForm, setPackingForm] = useState(initialPackingForm);
  const [riderForm, setRiderForm] = useState(initialRiderForm);
  const [deliveryActionForms, setDeliveryActionForms] = useState({});
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [packingOrderId, setPackingOrderId] = useState(null);
  const [creatingRider, setCreatingRider] = useState(false);
  const [generatingSlots, setGeneratingSlots] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [dashboardData, orderResult, dispatchData, slotResult] = await Promise.all([
        adminApi.dashboard(),
        orderApi.list(),
        dispatchApi.board(),
        deliverySlotApi.adminGetAll()
      ]);
      setDashboard(dashboardData);
      setOrders(orderResult.orders || []);
      setDispatchBoard(dispatchData);
      setDeliverySlots(slotResult || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrderDetail = useCallback(async (orderId) => {
    setDetailLoading(true);
    setSelectedOrderId(orderId);
    try {
      const order = await orderApi.getById(orderId);
      setSelectedOrder(order);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load order detail.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshAfterAction = async (message) => {
    setSuccess(message);
    await loadData();
    if (selectedOrderId) {
      await loadOrderDetail(selectedOrderId);
    }
  };

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalizedQuery) return true;
      return [
        `#${order.id}`,
        order.customer?.name || "",
        order.customer?.email || "",
        order.delivery?.address || "",
        order.status,
        order.paymentStatus,
        order.refundStatus
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [orders, query, statusFilter]);

  const handleStatusAction = async (order, nextStatus) => {
    const destructive = ["CANCELLED"].includes(nextStatus);
    if (destructive && !window.confirm(`Cancel order #${order.id}? This will stop fulfillment and delivery.`)) {
      return;
    }

    setBusyAction(`${order.id}:${nextStatus}`);
    setError("");
    setSuccess("");
    try {
      await orderApi.updateStatus(order.id, {
        status: nextStatus,
        note: nextStatus === "CANCELLED" ? "Cancelled from admin order workflow." : undefined
      });
      await refreshAfterAction(`Order #${order.id} moved to ${STATUS_LABELS[nextStatus] || nextStatus}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update order status.");
    } finally {
      setBusyAction("");
    }
  };

  const handleMarkPacked = async (event) => {
    event.preventDefault();
    setPackingOrderId(Number(packingForm.orderId));
    setError("");
    setSuccess("");
    try {
      await fulfillmentApi.markPacked(Number(packingForm.orderId), {
        stagingLabel: packingForm.stagingLabel,
        stagingZone: packingForm.stagingZone
      });
      setPackingForm(initialPackingForm);
      await refreshAfterAction(`Order #${packingForm.orderId} staged for delivery.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to mark order packed.");
    } finally {
      setPackingOrderId(null);
    }
  };

  const handleCreateRider = async (event) => {
    event.preventDefault();
    setCreatingRider(true);
    setError("");
    setSuccess("");
    try {
      const rider = await dispatchApi.createRider(riderForm);
      setRiderForm(initialRiderForm);
      await refreshAfterAction(`Rider account created for ${rider.name}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create rider.");
    } finally {
      setCreatingRider(false);
    }
  };

  const handleAssignRider = async (orderId, riderId) => {
    setBusyAction(`${orderId}:assign`);
    setError("");
    setSuccess("");
    try {
      await dispatchApi.assignRider(orderId, Number(riderId));
      await refreshAfterAction(`Rider assigned to order #${orderId}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to assign rider.");
    } finally {
      setBusyAction("");
    }
  };

  const handleStartDispatch = async (orderId) => {
    setBusyAction(`${orderId}:dispatch`);
    setError("");
    setSuccess("");
    try {
      await dispatchApi.startDispatch(orderId);
      await refreshAfterAction(`Order #${orderId} is now out for delivery.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to start dispatch.");
    } finally {
      setBusyAction("");
    }
  };

  const updateDeliveryActionForm = (assignmentId, field, value) => {
    setDeliveryActionForms((current) => ({
      ...current,
      [assignmentId]: {
        ...(current[assignmentId] || createInitialDeliveryActionForm()),
        [field]: value
      }
    }));
  };

  const handleCompleteDispatch = async (assignment) => {
    const form = deliveryActionForms[assignment.id] || createInitialDeliveryActionForm();
    if (!form.recipientName.trim()) {
      setError("Recipient name is required to complete a delivery.");
      return;
    }

    setBusyAction(`${assignment.order.id}:complete`);
    setError("");
    setSuccess("");
    try {
      await dispatchApi.completeDispatch(assignment.order.id, {
        recipientName: form.recipientName.trim(),
        proofNote: form.proofNote.trim() || null
      });
      setDeliveryActionForms((current) => ({ ...current, [assignment.id]: createInitialDeliveryActionForm() }));
      await refreshAfterAction(`Order #${assignment.order.id} marked as delivered.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete dispatch.");
    } finally {
      setBusyAction("");
    }
  };

  const handleFailDispatch = async (assignment) => {
    const form = deliveryActionForms[assignment.id] || createInitialDeliveryActionForm();
    if (!form.proofNote.trim()) {
      setError("A delivery failure note is required.");
      return;
    }

    if (!window.confirm(`Mark delivery for order #${assignment.order.id} as failed?`)) {
      return;
    }

    setBusyAction(`${assignment.order.id}:fail`);
    setError("");
    setSuccess("");
    try {
      await dispatchApi.failDispatch(assignment.order.id, {
        proofNote: form.proofNote.trim()
      });
      setDeliveryActionForms((current) => ({ ...current, [assignment.id]: createInitialDeliveryActionForm() }));
      await refreshAfterAction(`Order #${assignment.order.id} marked as delivery failed.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to fail dispatch.");
    } finally {
      setBusyAction("");
    }
  };

  const handleCompleteRefund = async (orderId) => {
    if (!window.confirm(`Mark refund for order #${orderId} as completed?`)) {
      return;
    }

    setBusyAction(`${orderId}:refund`);
    setError("");
    setSuccess("");
    try {
      await adminApi.completeRefund(orderId);
      await refreshAfterAction(`Refund for order #${orderId} marked as completed.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete refund.");
    } finally {
      setBusyAction("");
    }
  };

  const handleGenerateSlots = async (event) => {
    event.preventDefault();
    setGeneratingSlots(true);
    setError("");
    setSuccess("");
    try {
      await deliverySlotApi.generate(slotDate, STANDARD_DELIVERY_SHIFTS);
      await refreshAfterAction(`Delivery slots generated for ${slotDate}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to generate delivery slots.");
    } finally {
      setGeneratingSlots(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading orders and dispatch..." />;
  }

  const upcomingSlots = deliverySlots.filter((slot) => new Date(slot.date) >= new Date());
  const packingOrders = orders.filter((order) => order.status === "PACKING");
  const pendingCount = orders.filter((order) => order.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Fulfillment"
        title="Orders and dispatch"
        description="Confirm orders, prepare groceries, assign riders, and complete deliveries from one clear workflow."
      />

      {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending confirmation" value={pendingCount} tone={pendingCount > 0 ? "warning" : "default"} icon={ClipboardList} />
        <StatCard label="Pending refunds" value={dashboard?.totals?.pendingRefunds || 0} tone={(dashboard?.totals?.pendingRefunds || 0) > 0 ? "warning" : "default"} />
        <StatCard label="Ready for delivery" value={dispatchBoard.readyOrders.length} icon={PackageCheck} />
        <StatCard label="Active deliveries" value={dispatchBoard.activeAssignments.length} tone="success" icon={Truck} />
      </div>

      <SectionCard title="Order queue" description="Click an order to view customer details, payment status, timeline, and the next valid action.">
        <div className="space-y-5">
          <FilterToolbar
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder="Search by order, customer, address, status, or payment"
          >
            <select className="field min-w-[190px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All fulfillment statuses</option>
              {ORDER_STEPS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
              <option value="CANCELLED">Cancelled</option>
            </select>
          </FilterToolbar>

          <div className="flex flex-wrap gap-2">
            {["ALL", "PENDING", "CONFIRMED", "PACKING", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"].map((status) => (
              <button
                key={status}
                type="button"
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  statusFilter === status ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status === "ALL" ? "All" : STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const latestAssignment = order.delivery?.assignments?.[0] || null;
              return (
                <button
                  key={order.id}
                  type="button"
                  className="w-full rounded-[22px] border border-slate-100 bg-slate-50/70 p-4 text-left transition hover:border-brand-200 hover:bg-white hover:shadow-sm"
                  onClick={() => loadOrderDetail(order.id)}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-slate-900">Order #{order.id}</p>
                        <StatusBadge status={order.status} />
                        <StatusBadge status={order.paymentStatus} />
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                        <span>Customer: {order.customer?.name || "Guest"}</span>
                        <span>Total: {currency(order.total)}</span>
                        <span>Placed: {formatDateTime(order.createdAt)}</span>
                        <span>Delivery: {order.deliverySlot ? `${order.deliverySlot.startTime}-${order.deliverySlot.endTime}` : "Flexible"}</span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                        {order.delivery?.address || "No delivery address"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {latestAssignment ? (
                        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          <UserRound className="mr-1.5 h-3.5 w-3.5" />
                          {latestAssignment.rider?.user?.name || latestAssignment.rider?.name || "Assigned"}
                        </span>
                      ) : null}
                      <span className="btn-secondary px-4 py-2 text-sm">View workflow</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredOrders.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 px-4 py-10 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-900">No orders found</p>
                <p className="mt-1 text-sm text-slate-500">Try a different search or status filter.</p>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <SectionCard title="Packing station" description="Stage packed orders with a label and zone before dispatch.">
            <form onSubmit={handleMarkPacked} className="space-y-4">
              <FormSection title="Pack order">
                <div className="grid gap-4">
                  <select
                    className="field"
                    value={packingForm.orderId}
                    onChange={(event) => setPackingForm((current) => ({ ...current, orderId: event.target.value }))}
                    required
                  >
                    <option value="">Choose order in packing</option>
                    {packingOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Order #{order.id} - {order.customer?.name || "Guest"}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field"
                    placeholder="Staging label"
                    value={packingForm.stagingLabel}
                    onChange={(event) =>
                      setPackingForm((current) => ({ ...current, stagingLabel: event.target.value }))
                    }
                    required
                  />
                  <input
                    className="field"
                    placeholder="Staging zone"
                    value={packingForm.stagingZone}
                    onChange={(event) =>
                      setPackingForm((current) => ({ ...current, stagingZone: event.target.value }))
                    }
                    required
                  />
                </div>
              </FormSection>
              <button type="submit" className="btn-primary px-5 py-3" disabled={packingOrderId !== null || packingOrders.length === 0}>
                {packingOrderId !== null ? "Saving..." : "Mark packed"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Delivery slots" description="Generate and review dispatch capacity windows.">
            <form onSubmit={handleGenerateSlots} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input className="field max-w-xs" type="date" value={slotDate} onChange={(event) => setSlotDate(event.target.value)} required />
                <button type="submit" className="btn-primary px-5 py-3" disabled={generatingSlots}>
                  {generatingSlots ? "Generating..." : "Generate standard slots"}
                </button>
              </div>
            </form>
            <div className="mt-5 space-y-3">
              {upcomingSlots.slice(0, 6).map((slot) => (
                <div key={slot.id} className="rounded-[18px] border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-500">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {slot.date} - {slot.startTime} to {slot.endTime}
                      </p>
                      <p className="mt-1">Booked {slot.currentOrders}/{slot.maxOrders} orders</p>
                    </div>
                    <StatusBadge status={slot.status || "SCHEDULED"} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Dispatch board" description="Assign riders and move staged orders into delivery.">
            <div className="space-y-4">
              {dispatchBoard.readyOrders.map((order) => {
                const assigned = order.delivery?.assignments?.[0] || null;
                return (
                  <div key={order.id} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-slate-900">Order #{order.id}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {order.customer?.name || "Guest"} - {order.stagingLabel || "No label"} {order.stagingZone ? `- ${order.stagingZone}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {assigned ? (
                          <button
                            type="button"
                            className="btn-primary px-4 py-2"
                            onClick={() => handleStartDispatch(order.id)}
                            disabled={Boolean(busyAction)}
                          >
                            Mark out for delivery
                          </button>
                        ) : (
                          <select
                            className="field min-w-[220px]"
                            defaultValue=""
                            onChange={(event) => event.target.value && handleAssignRider(order.id, event.target.value)}
                            disabled={Boolean(busyAction)}
                          >
                            <option value="">Assign available rider</option>
                            {dispatchBoard.riders
                              .filter((rider) => rider.isAvailable)
                              .map((rider) => (
                                <option key={rider.id} value={rider.id}>
                                  {rider.name} - {rider.vehicleType}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {dispatchBoard.readyOrders.length === 0 ? <p className="text-sm text-slate-500">No ready-for-delivery orders waiting for dispatch.</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Rider pool and active deliveries" description="Create riders and manage proof-of-delivery actions.">
            <div className="space-y-6">
              <form onSubmit={handleCreateRider} className="space-y-4">
                <FormSection title="Create rider">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input className="field" placeholder="Full name" value={riderForm.name} onChange={(event) => setRiderForm((current) => ({ ...current, name: event.target.value }))} required />
                    <input className="field" type="email" placeholder="Email" value={riderForm.email} onChange={(event) => setRiderForm((current) => ({ ...current, email: event.target.value }))} required />
                    <input className="field" placeholder="Phone" value={riderForm.phone} onChange={(event) => setRiderForm((current) => ({ ...current, phone: event.target.value }))} required />
                    <input className="field" placeholder="Vehicle type" value={riderForm.vehicleType} onChange={(event) => setRiderForm((current) => ({ ...current, vehicleType: event.target.value }))} required />
                    <input className="field sm:col-span-2" type="password" placeholder="Temporary password" value={riderForm.password} onChange={(event) => setRiderForm((current) => ({ ...current, password: event.target.value }))} required />
                  </div>
                </FormSection>
                <button type="submit" className="btn-secondary px-5 py-3" disabled={creatingRider}>
                  {creatingRider ? "Creating..." : "Create rider"}
                </button>
              </form>

              <div className="space-y-3">
                {dispatchBoard.activeAssignments.map((assignment) => {
                  const form = deliveryActionForms[assignment.id] || createInitialDeliveryActionForm();
                  return (
                    <div key={assignment.id} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            Order #{assignment.order?.id} - {assignment.rider?.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {assignment.delivery?.address || "No delivery address"}
                          </p>
                        </div>
                        <StatusBadge status={assignment.status} />
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input
                          className="field"
                          placeholder="Recipient name"
                          value={form.recipientName}
                          onChange={(event) => updateDeliveryActionForm(assignment.id, "recipientName", event.target.value)}
                        />
                        <input
                          className="field"
                          placeholder="Proof or failure note"
                          value={form.proofNote}
                          onChange={(event) => updateDeliveryActionForm(assignment.id, "proofNote", event.target.value)}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="btn-primary px-4 py-2"
                          onClick={() => handleCompleteDispatch(assignment)}
                          disabled={Boolean(busyAction)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete delivery
                        </button>
                        <button
                          type="button"
                          className="btn-danger px-4 py-2"
                          onClick={() => handleFailDispatch(assignment)}
                          disabled={Boolean(busyAction)}
                        >
                          Mark failed
                        </button>
                      </div>
                    </div>
                  );
                })}
                {dispatchBoard.activeAssignments.length === 0 ? <p className="text-sm text-slate-500">No active dispatch assignments right now.</p> : null}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <OrderDetailDrawer
        order={selectedOrder}
        loading={detailLoading}
        onClose={() => {
          setSelectedOrderId(null);
          setSelectedOrder(null);
        }}
        onStatusAction={handleStatusAction}
        onAssignRider={handleAssignRider}
        onStartDispatch={handleStartDispatch}
        onCompleteRefund={handleCompleteRefund}
        riders={dispatchBoard.riders}
        busyAction={Boolean(busyAction)}
      />
    </div>
  );
}

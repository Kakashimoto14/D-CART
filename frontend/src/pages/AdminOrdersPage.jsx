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

export function AdminOrdersPage() {
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dispatchBoard, setDispatchBoard] = useState({ riders: [], readyOrders: [], activeAssignments: [] });
  const [deliverySlots, setDeliverySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [packingForm, setPackingForm] = useState(initialPackingForm);
  const [riderForm, setRiderForm] = useState(initialRiderForm);
  const [deliveryActionForms, setDeliveryActionForms] = useState({});
  const [packingOrderId, setPackingOrderId] = useState(null);
  const [readyingOrderId, setReadyingOrderId] = useState(null);
  const [creatingRider, setCreatingRider] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState(null);
  const [startingDispatchId, setStartingDispatchId] = useState(null);
  const [completingDispatchId, setCompletingDispatchId] = useState(null);
  const [failingDispatchId, setFailingDispatchId] = useState(null);
  const [completingRefundOrderId, setCompletingRefundOrderId] = useState(null);
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (!normalizedQuery) return true;
      return [
        `#${order.id}`,
        order.customer?.name || "",
        order.status,
        order.paymentStatus,
        order.refundStatus
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [orders, query]);

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
      setSuccess(`Order #${packingForm.orderId} marked as packed.`);
      setPackingForm(initialPackingForm);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to mark order packed.");
    } finally {
      setPackingOrderId(null);
    }
  };

  const handleMarkReady = async (orderId) => {
    setReadyingOrderId(orderId);
    setError("");
    setSuccess("");
    try {
      await fulfillmentApi.markReady(orderId);
      setSuccess(`Order #${orderId} is ready for dispatch.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to mark order ready.");
    } finally {
      setReadyingOrderId(null);
    }
  };

  const handleCreateRider = async (event) => {
    event.preventDefault();
    setCreatingRider(true);
    setError("");
    setSuccess("");
    try {
      const rider = await dispatchApi.createRider(riderForm);
      setSuccess(`Rider account created for ${rider.name}.`);
      setRiderForm(initialRiderForm);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create rider.");
    } finally {
      setCreatingRider(false);
    }
  };

  const handleAssignRider = async (orderId, riderId) => {
    setAssigningOrderId(orderId);
    setError("");
    setSuccess("");
    try {
      await dispatchApi.assignRider(orderId, Number(riderId));
      setSuccess(`Rider assigned to order #${orderId}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to assign rider.");
    } finally {
      setAssigningOrderId(null);
    }
  };

  const handleStartDispatch = async (orderId) => {
    setStartingDispatchId(orderId);
    setError("");
    setSuccess("");
    try {
      await dispatchApi.startDispatch(orderId);
      setSuccess(`Order #${orderId} is now out for delivery.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to start dispatch.");
    } finally {
      setStartingDispatchId(null);
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
    setCompletingDispatchId(assignment.id);
    setError("");
    setSuccess("");
    try {
      await dispatchApi.completeDispatch(assignment.order.id, {
        recipientName: form.recipientName.trim(),
        proofNote: form.proofNote.trim() || null
      });
      setSuccess(`Order #${assignment.order.id} marked as delivered.`);
      setDeliveryActionForms((current) => ({ ...current, [assignment.id]: createInitialDeliveryActionForm() }));
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete dispatch.");
    } finally {
      setCompletingDispatchId(null);
    }
  };

  const handleFailDispatch = async (assignment) => {
    const form = deliveryActionForms[assignment.id] || createInitialDeliveryActionForm();
    if (!form.proofNote.trim()) {
      setError("A delivery failure note is required.");
      return;
    }
    setFailingDispatchId(assignment.id);
    setError("");
    setSuccess("");
    try {
      await dispatchApi.failDispatch(assignment.order.id, {
        proofNote: form.proofNote.trim()
      });
      setSuccess(`Order #${assignment.order.id} marked as delivery failed.`);
      setDeliveryActionForms((current) => ({ ...current, [assignment.id]: createInitialDeliveryActionForm() }));
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to fail dispatch.");
    } finally {
      setFailingDispatchId(null);
    }
  };

  const handleCompleteRefund = async (orderId) => {
    setCompletingRefundOrderId(orderId);
    setError("");
    setSuccess("");
    try {
      await adminApi.completeRefund(orderId);
      setSuccess(`Refund for order #${orderId} marked as completed.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete refund.");
    } finally {
      setCompletingRefundOrderId(null);
    }
  };

  const handleGenerateSlots = async (event) => {
    event.preventDefault();
    setGeneratingSlots(true);
    setError("");
    setSuccess("");
    try {
      await deliverySlotApi.generate(slotDate, STANDARD_DELIVERY_SHIFTS);
      setSuccess(`Delivery slots generated for ${slotDate}.`);
      await loadData();
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

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Orders"
        title="Fulfillment, dispatch, and refund control"
        description="This view keeps the full back-office lifecycle reachable without overwhelming the main dashboard."
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending orders" value={dashboard?.totals?.pendingOrders || 0} />
        <StatCard label="Pending refunds" value={dashboard?.totals?.pendingRefunds || 0} tone={(dashboard?.totals?.pendingRefunds || 0) > 0 ? "warning" : "default"} />
        <StatCard label="Ready for dispatch" value={dispatchBoard.readyOrders.length} />
        <StatCard label="Active deliveries" value={dispatchBoard.activeAssignments.length} tone="success" />
      </div>

      <SectionCard title="Order queue" description="Search orders and resolve packing or refund exceptions.">
        <div className="space-y-5">
          <FilterToolbar
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder="Search by order, customer, status, payment, or refund"
          />
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-slate-900">Order #{order.id}</p>
                      <StatusBadge status={order.status} />
                      <StatusBadge status={order.paymentStatus} />
                      {order.refundStatus ? <StatusBadge status={order.refundStatus} /> : null}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                      <span>Customer: {order.customer?.name || "Guest"}</span>
                      <span>Total: {currency(order.total)}</span>
                      <span>Placed: {formatDateTime(order.createdAt)}</span>
                      <span>Delivery: {order.deliverySlot ? `${order.deliverySlot.startTime}-${order.deliverySlot.endTime}` : "Flexible"}</span>
                    </div>
                    {order.stagingLabel || order.stagingZone ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Staging: {order.stagingLabel || "No label"} {order.stagingZone ? `• ${order.stagingZone}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {order.status === "PACKING" ? (
                      <button
                        type="button"
                        className="btn-secondary px-4 py-2"
                        onClick={() =>
                          setPackingForm({
                            orderId: String(order.id),
                            stagingLabel: order.stagingLabel || "",
                            stagingZone: order.stagingZone || ""
                          })
                        }
                      >
                        Prepare packing
                      </button>
                    ) : null}
                    {order.status === "PACKED" ? (
                      <button
                        type="button"
                        className="btn-primary px-4 py-2"
                        onClick={() => handleMarkReady(order.id)}
                        disabled={readyingOrderId === order.id}
                      >
                        {readyingOrderId === order.id ? "Updating..." : "Mark ready"}
                      </button>
                    ) : null}
                    {order.refundStatus === "PENDING" ? (
                      <button
                        type="button"
                        className="btn-secondary px-4 py-2"
                        onClick={() => handleCompleteRefund(order.id)}
                        disabled={completingRefundOrderId === order.id}
                      >
                        {completingRefundOrderId === order.id ? "Completing..." : "Complete refund"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 ? (
              <p className="rounded-[20px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No orders match the current search.
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <SectionCard title="Packing station" description="Anchor the pack-and-stage step before dispatch.">
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
                    {orders
                      .filter((order) => order.status === "PACKING")
                      .map((order) => (
                        <option key={order.id} value={order.id}>
                          Order #{order.id} • {order.customer?.name || "Guest"}
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
              <button type="submit" className="btn-primary px-5 py-3" disabled={packingOrderId !== null}>
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
                        {slot.date} • {slot.startTime} - {slot.endTime}
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
                          {order.customer?.name || "Guest"} • {order.stagingLabel || "No label"} {order.stagingZone ? `• ${order.stagingZone}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {assigned ? (
                          <button
                            type="button"
                            className="btn-primary px-4 py-2"
                            onClick={() => handleStartDispatch(order.id)}
                            disabled={startingDispatchId === order.id}
                          >
                            {startingDispatchId === order.id ? "Starting..." : "Start dispatch"}
                          </button>
                        ) : (
                          <select
                            className="field min-w-[220px]"
                            defaultValue=""
                            onChange={(event) => event.target.value && handleAssignRider(order.id, event.target.value)}
                            disabled={assigningOrderId === order.id}
                          >
                            <option value="">Assign available rider</option>
                            {dispatchBoard.riders
                              .filter((rider) => rider.isAvailable)
                              .map((rider) => (
                                <option key={rider.id} value={rider.id}>
                                  {rider.name} • {rider.vehicleType}
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
                            Order #{assignment.order?.id} • {assignment.rider?.name}
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
                          disabled={completingDispatchId === assignment.id}
                        >
                          {completingDispatchId === assignment.id ? "Completing..." : "Complete delivery"}
                        </button>
                        <button
                          type="button"
                          className="btn-danger px-4 py-2"
                          onClick={() => handleFailDispatch(assignment)}
                          disabled={failingDispatchId === assignment.id}
                        >
                          {failingDispatchId === assignment.id ? "Saving..." : "Mark failed"}
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
    </div>
  );
}

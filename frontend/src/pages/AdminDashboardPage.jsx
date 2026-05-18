import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/adminApi";
import { categoryApi } from "../api/categoryApi";
import { dispatchApi } from "../api/dispatchApi";
import { deliverySlotApi } from "../api/deliverySlotApi";
import { fulfillmentApi } from "../api/fulfillmentApi";
import { inventoryApi } from "../api/inventoryApi";
import { orderApi } from "../api/orderApi";
import { productApi } from "../api/productApi";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { useOrderRealtime } from "../hooks/useOrderRealtime";
import { currency, formatDateTime } from "../utils/format";

const initialForm = {
  id: null,
  name: "",
  price: "",
  stock: "",
  categoryId: ""
};

const initialStaffForm = {
  name: "",
  email: "",
  phone: "",
  password: ""
};

const initialReceiveForm = {
  productId: "",
  quantity: "",
  supplier: "",
  expiresAt: ""
};

const initialPackingForm = {
  orderId: null,
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

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliverySlots, setDeliverySlots] = useState([]);
  const [dispatchBoard, setDispatchBoard] = useState({
    riders: [],
    readyOrders: [],
    activeAssignments: []
  });
  const [inventoryAlerts, setInventoryAlerts] = useState({ lowStock: [], nearExpiry: [] });
  const [productForm, setProductForm] = useState(initialForm);
  const [staffForm, setStaffForm] = useState(initialStaffForm);
  const [receiveForm, setReceiveForm] = useState(initialReceiveForm);
  const [packingForm, setPackingForm] = useState(initialPackingForm);
  const [riderForm, setRiderForm] = useState(initialRiderForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [generatingSlots, setGeneratingSlots] = useState(false);
  const [receivingStock, setReceivingStock] = useState(false);
  const [cleaningReservations, setCleaningReservations] = useState(false);
  const [packingOrderId, setPackingOrderId] = useState(null);
  const [readyingOrderId, setReadyingOrderId] = useState(null);
  const [creatingRider, setCreatingRider] = useState(false);
  const [completingRefundOrderId, setCompletingRefundOrderId] = useState(null);
  const [retryingNotificationId, setRetryingNotificationId] = useState(null);
  const [assigningOrderId, setAssigningOrderId] = useState(null);
  const [startingDispatchId, setStartingDispatchId] = useState(null);
  const [completingDispatchId, setCompletingDispatchId] = useState(null);
  const [failingDispatchId, setFailingDispatchId] = useState(null);
  const [deliveryActionForms, setDeliveryActionForms] = useState({});
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().split("T")[0]);

  const loadData = useCallback(async () => {
    try {
      const [categoryData, dashboardData, dispatchData, inventoryAlertData, productResult, orderResult, slotResult] = await Promise.all([
        categoryApi.list(),
        adminApi.dashboard(),
        dispatchApi.board(),
        inventoryApi.alerts(),
        productApi.list(),
        orderApi.list(),
        deliverySlotApi.adminGetAll()
      ]);

      setCategories(categoryData);
      setDashboard(dashboardData);
      setDispatchBoard(dispatchData);
      setInventoryAlerts(inventoryAlertData);
      setProducts(productResult.products);
      setOrders(orderResult.orders);
      setDeliverySlots(slotResult);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const { isConnected } = useOrderRealtime(
    useCallback(
      async (event) => {
        setLiveMessage(`Order #${event.orderId} changed: ${event.type.replaceAll("_", " ")}.`);
        await loadData();
      },
      [loadData]
    )
  );

  const resetForm = () => setProductForm(initialForm);
  const resetStaffForm = () => setStaffForm(initialStaffForm);
  const resetReceiveForm = () => setReceiveForm(initialReceiveForm);
  const resetPackingForm = () => setPackingForm(initialPackingForm);
  const resetRiderForm = () => setRiderForm(initialRiderForm);

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");

    const payload = {
      name: productForm.name,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      categoryId: Number(productForm.categoryId)
    };

    try {
      if (productForm.id) {
        await productApi.update(productForm.id, payload);
      } else {
        await productApi.create(payload);
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await productApi.remove(productId);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete product.");
    }
  };

  const handleStatusChange = async (orderId, status) => {
    setError("");
    setSuccessMessage("");

    try {
      await orderApi.updateStatus(orderId, { status });
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update order status.");
    }
  };

  const handleStaffSubmit = async (event) => {
    event.preventDefault();
    setCreatingStaff(true);
    setError("");
    setSuccessMessage("");

    try {
      const staff = await adminApi.createStaff(staffForm);
      resetStaffForm();
      setSuccessMessage(`Staff account created for ${staff.name}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create staff account.");
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleGenerateSlots = async (event) => {
    event.preventDefault();
    setGeneratingSlots(true);
    setError("");
    setSuccessMessage("");

    try {
      await deliverySlotApi.generate(slotDate, STANDARD_DELIVERY_SHIFTS);
      setSuccessMessage(`Delivery slots generated for ${slotDate}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to generate delivery slots.");
    } finally {
      setGeneratingSlots(false);
    }
  };

  const handleReceiveStock = async (event) => {
    event.preventDefault();
    setReceivingStock(true);
    setError("");
    setSuccessMessage("");

    try {
      await inventoryApi.receiveStock(Number(receiveForm.productId), {
        quantity: Number(receiveForm.quantity),
        supplier: receiveForm.supplier || null,
        expiresAt: receiveForm.expiresAt ? new Date(receiveForm.expiresAt).toISOString() : null
      });
      resetReceiveForm();
      setSuccessMessage("Stock received successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to receive stock.");
    } finally {
      setReceivingStock(false);
    }
  };

  const handleCleanupExpiredReservations = async () => {
    setCleaningReservations(true);
    setError("");
    setSuccessMessage("");

    try {
      const cleanup = await inventoryApi.cleanupExpiredReservations();
      setSuccessMessage(
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

  const handleMarkPacked = async (event) => {
    event.preventDefault();
    setPackingOrderId(packingForm.orderId);
    setError("");
    setSuccessMessage("");

    try {
      await fulfillmentApi.markPacked(packingForm.orderId, {
        stagingLabel: packingForm.stagingLabel,
        stagingZone: packingForm.stagingZone
      });
      setSuccessMessage(`Order #${packingForm.orderId} marked as packed.`);
      resetPackingForm();
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
    setSuccessMessage("");

    try {
      await fulfillmentApi.markReady(orderId);
      setSuccessMessage(`Order #${orderId} is ready for dispatch.`);
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
    setSuccessMessage("");

    try {
      const rider = await dispatchApi.createRider(riderForm);
      resetRiderForm();
      setSuccessMessage(`Rider account created for ${rider.name}.`);
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
    setSuccessMessage("");

    try {
      await dispatchApi.assignRider(orderId, Number(riderId));
      setSuccessMessage(`Rider assigned to order #${orderId}.`);
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
    setSuccessMessage("");

    try {
      await dispatchApi.startDispatch(orderId);
      setSuccessMessage(`Order #${orderId} is now out for delivery.`);
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
    setSuccessMessage("");

    try {
      await dispatchApi.completeDispatch(assignment.order.id, {
        recipientName: form.recipientName.trim(),
        proofNote: form.proofNote.trim() || null
      });
      setDeliveryActionForms((current) => ({
        ...current,
        [assignment.id]: createInitialDeliveryActionForm()
      }));
      setSuccessMessage(`Order #${assignment.order.id} marked as delivered.`);
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
    setSuccessMessage("");

    try {
      await dispatchApi.failDispatch(assignment.order.id, {
        proofNote: form.proofNote.trim()
      });
      setDeliveryActionForms((current) => ({
        ...current,
        [assignment.id]: createInitialDeliveryActionForm()
      }));
      setSuccessMessage(`Order #${assignment.order.id} marked as delivery failed.`);
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
    setSuccessMessage("");

    try {
      await adminApi.completeRefund(orderId);
      setSuccessMessage(`Refund for order #${orderId} marked as completed.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete refund.");
    } finally {
      setCompletingRefundOrderId(null);
    }
  };

  const handleRetryNotification = async (notificationLogId) => {
    setRetryingNotificationId(notificationLogId);
    setError("");
    setSuccessMessage("");

    try {
      await adminApi.retryNotification(notificationLogId);
      setSuccessMessage(`Notification #${notificationLogId} requeued for delivery.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to retry notification.");
    } finally {
      setRetryingNotificationId(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading admin dashboard..." />;
  }

  const upcomingSlots = deliverySlots.filter((slot) => new Date(slot.date) >= new Date());

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg bg-white/70 px-6 py-6 backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
            Admin
          </p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Operations dashboard</h2>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {successMessage ? <p className="text-sm font-medium text-emerald-600">{successMessage}</p> : null}
      <p className="text-sm text-slate-500">
        Operations live feed is {isConnected ? "connected" : "connecting"}.
        {liveMessage ? ` ${liveMessage}` : ""}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
        <MetricCard label="Orders" value={dashboard?.totals.orders || 0} />
        <MetricCard label="Delivered" value={dashboard?.totals.delivered || 0} />
        <MetricCard label="Products" value={dashboard?.totals.products || 0} />
        <MetricCard label="Pending" value={dashboard?.totals.pendingOrders || 0} />
        <MetricCard
          label="Refunds"
          value={dashboard?.totals.pendingRefunds || 0}
          valueClassName={dashboard?.totals.pendingRefunds > 0 ? "text-amber-600" : "text-ink"}
        />
        <MetricCard label="Sales" value={currency(dashboard?.totals.sales || 0)} />
        <MetricCard
          label="Low Stock"
          value={dashboard?.totals.lowStockAlerts || 0}
          valueClassName={dashboard?.totals.lowStockAlerts > 0 ? "text-rose-600" : "text-ink"}
        />
        <MetricCard
          label="Near Expiry"
          value={dashboard?.totals.nearExpiryAlerts || 0}
          valueClassName={dashboard?.totals.nearExpiryAlerts > 0 ? "text-amber-600" : "text-ink"}
        />
        <MetricCard
          label="Overdue Res."
          value={dashboard?.totals.overdueReservations || 0}
          valueClassName={dashboard?.totals.overdueReservations > 0 ? "text-rose-600" : "text-ink"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="AOV" value={currency(dashboard?.analytics?.averageOrderValue || 0)} />
        <MetricCard
          label="Cancel Rate"
          value={`${dashboard?.analytics?.cancellationRate || 0}%`}
          valueClassName={
            (dashboard?.analytics?.cancellationRate || 0) > 10 ? "text-rose-600" : "text-ink"
          }
        />
        <MetricCard
          label="Fill Rate"
          value={`${dashboard?.analytics?.fulfillmentRate || 0}%`}
        />
        <MetricCard
          label="Delivered Today"
          value={dashboard?.totals?.deliveredToday || 0}
        />
        <MetricCard
          label="Refund Value"
          value={currency(dashboard?.analytics?.refundedAmount || 0)}
          valueClassName={
            (dashboard?.analytics?.refundedAmount || 0) > 0 ? "text-amber-600" : "text-ink"
          }
        />
        <MetricCard
          label="Avg Cycle"
          value={`${dashboard?.analytics?.averageCompletionMinutes || 0}m`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Redis"
          value={dashboard?.runtime?.redisStatus || "unknown"}
          valueClassName={
            dashboard?.runtime?.redisStatus === "ready" ? "text-emerald-600" : "text-amber-600"
          }
        />
        <MetricCard
          label="Queue Waiting"
          value={dashboard?.runtime?.queueTotals?.waiting || 0}
          valueClassName={
            (dashboard?.runtime?.queueTotals?.waiting || 0) > 0 ? "text-amber-600" : "text-ink"
          }
        />
        <MetricCard
          label="Queue Active"
          value={dashboard?.runtime?.queueTotals?.active || 0}
        />
        <MetricCard
          label="Queue Failed"
          value={dashboard?.runtime?.queueTotals?.failed || 0}
          valueClassName={
            (dashboard?.runtime?.queueTotals?.failed || 0) > 0 ? "text-rose-600" : "text-ink"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
        <MetricCard
          label="Notif Sent 24h"
          value={dashboard?.notifications?.last24Hours?.sent || 0}
        />
        <MetricCard
          label="Notif Failed 24h"
          value={dashboard?.notifications?.last24Hours?.failed || 0}
          valueClassName={
            (dashboard?.notifications?.last24Hours?.failed || 0) > 0 ? "text-rose-600" : "text-ink"
          }
        />
        <MetricCard
          label="Notif Skipped 24h"
          value={dashboard?.notifications?.last24Hours?.skipped || 0}
          valueClassName={
            (dashboard?.notifications?.last24Hours?.skipped || 0) > 0 ? "text-amber-600" : "text-ink"
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Reservation maintenance
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Checkout hold cleanup</h3>
          </div>
          <p className="text-sm text-slate-500">
            Use this fallback cleanup when Redis-backed delayed expiry is not available.
          </p>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Overdue active reservations
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {dashboard?.totals?.overdueReservations || 0} reservation(s) past expiry
              </p>
            </div>
            <button
              type="button"
              onClick={handleCleanupExpiredReservations}
              disabled={cleaningReservations}
              className="btn-primary px-4 py-2"
            >
              {cleaningReservations ? "Cleaning..." : "Clean expired holds"}
            </button>
          </div>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Operations analytics
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Fulfillment and dispatch timing</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-100 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Order to door
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard?.analytics?.averageCompletionMinutes || 0}m
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Pack to dispatch
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard?.analytics?.averagePackToDispatchMinutes || 0}m
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Dispatch to door
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard?.analytics?.averageDispatchToDoorMinutes || 0}m
              </p>
            </div>
          </div>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Runtime
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Queue and Redis health</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(dashboard?.runtime?.queues || {}).map(([queueName, counts]) => (
              <div
                key={queueName}
                className="rounded-lg border border-slate-100 px-4 py-4 text-sm text-slate-600"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-slate-900">{queueName}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    waiting {counts.waiting || 0} | active {counts.active || 0} | failed {counts.failed || 0}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  delayed {counts.delayed || 0} | completed {counts.completed || 0} | paused {counts.paused || 0}
                </p>
              </div>
            ))}
            {Object.keys(dashboard?.runtime?.queues || {}).length === 0 ? (
              <p className="text-sm text-slate-500">
                Queue telemetry will appear here once Redis-backed queues are enabled.
              </p>
            ) : null}
          </div>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Top movers
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Best-selling fulfilled products</h3>
          </div>
          <div className="space-y-4">
            {(dashboard?.topSellingProducts || []).map((product) => (
              <div key={product.productId} className="rounded-lg border border-slate-100 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.category || "Uncategorized"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{product.fulfilledQty} fulfilled</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.requestedQty} requested
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {(dashboard?.topSellingProducts || []).length === 0 ? (
              <p className="text-sm text-slate-500">No product movement data yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="panel px-6 py-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
            Notifications
          </p>
          <h3 className="mt-2 text-xl font-bold text-ink">Recent customer delivery updates</h3>
        </div>
        <div className="space-y-4">
          {(dashboard?.notifications?.recentLogs || []).map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-100 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {log.templateKey}
                    {log.orderId ? ` | Order #${log.orderId}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {log.customer?.name || log.recipient} | {log.recipient}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{log.subject}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Retries: {log.retryCount || 0}
                    {log.lastRetriedAt ? ` | Last retry ${formatDateTime(log.lastRetriedAt)}` : ""}
                  </p>
                  {log.errorMessage ? (
                    <p className="mt-1 text-sm font-medium text-rose-600">{log.errorMessage}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <StatusBadge status={log.status} />
                  <p className="mt-2 text-xs text-slate-400">
                    {formatDateTime(log.sentAt || log.createdAt)}
                  </p>
                  {["FAILED", "SKIPPED"].includes(log.status) ? (
                    <button
                      type="button"
                      onClick={() => handleRetryNotification(log.id)}
                      disabled={retryingNotificationId === log.id}
                      className="btn-secondary mt-3 px-3 py-2 text-xs"
                    >
                      {retryingNotificationId === log.id ? "Retrying..." : "Retry send"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {(dashboard?.notifications?.recentLogs || []).length === 0 ? (
            <p className="text-sm text-slate-500">
              Notification delivery logs will appear here once customer updates are sent.
            </p>
          ) : null}
        </div>
      </div>

      <div className="panel px-6 py-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
            Audit trail
          </p>
          <h3 className="mt-2 text-xl font-bold text-ink">Recent recovery and admin actions</h3>
        </div>
        <div className="space-y-4">
          {(dashboard?.audit?.recentLogs || []).map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-100 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{log.action}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {log.entityType}
                    {log.entityId ? ` | ${log.entityId}` : ""}
                    {log.actor?.name ? ` | ${log.actor.name}` : ""}
                  </p>
                  {log.metadata ? (
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
                <p className="whitespace-nowrap text-xs text-slate-400">
                  {formatDateTime(log.createdAt)}
                </p>
              </div>
            </div>
          ))}
          {(dashboard?.audit?.recentLogs || []).length === 0 ? (
            <p className="text-sm text-slate-500">
              Audit entries will appear here as staff complete recovery and admin actions.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
                Product form
              </p>
              <h3 className="mt-2 text-xl font-bold text-ink">
                {productForm.id ? "Update inventory item" : "Add inventory item"}
              </h3>
            </div>
            {productForm.id ? (
              <button type="button" onClick={resetForm} className="btn-secondary px-3 py-2">
                New item
              </button>
            ) : null}
          </div>

          <form onSubmit={handleProductSubmit} className="space-y-4">
            <input
              className="field"
              placeholder="Product name"
              value={productForm.name}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="field"
                type="number"
                step="0.01"
                placeholder="Price"
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, price: event.target.value }))
                }
                required
              />
              <input
                className="field"
                type="number"
                placeholder="Stock"
                value={productForm.stock}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, stock: event.target.value }))
                }
                required
              />
            </div>
            <select
              className="field"
              value={productForm.categoryId}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, categoryId: event.target.value }))
              }
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Saving..." : productForm.id ? "Update product" : "Create product"}
            </button>
          </form>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Inventory
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Product catalog management</h3>
          </div>
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-4 rounded-lg border border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h4 className="font-semibold text-slate-900">{product.name}</h4>
                  <p className="text-sm text-slate-500">
                    {currency(product.price)} / {product.unit || "pc"} | Stock{" "}
                    <span className={product.stock <= 10 ? "font-semibold text-rose-600" : ""}>
                      {product.stock}
                    </span>{" "}
                    | Category{" "}
                    {product.category?.name || product.categoryId}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm({
                        id: product.id,
                        name: product.name,
                        price: String(product.price),
                        stock: String(product.stock),
                        categoryId: String(product.categoryId)
                      })
                    }
                    className="btn-secondary px-3 py-2"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="btn-danger px-3 py-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Riders
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Create rider accounts</h3>
          </div>

          <form onSubmit={handleCreateRider} className="space-y-4">
            <input
              className="field"
              placeholder="Name"
              value={riderForm.name}
              onChange={(event) =>
                setRiderForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={riderForm.email}
              onChange={(event) =>
                setRiderForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
            <input
              className="field"
              placeholder="Phone"
              value={riderForm.phone}
              onChange={(event) =>
                setRiderForm((current) => ({ ...current, phone: event.target.value }))
              }
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="field"
                type="password"
                placeholder="Password"
                value={riderForm.password}
                onChange={(event) =>
                  setRiderForm((current) => ({ ...current, password: event.target.value }))
                }
                required
              />
              <input
                className="field"
                placeholder="Vehicle type"
                value={riderForm.vehicleType}
                onChange={(event) =>
                  setRiderForm((current) => ({ ...current, vehicleType: event.target.value }))
                }
                required
              />
            </div>
            <button type="submit" disabled={creatingRider} className="btn-primary w-full">
              {creatingRider ? "Creating..." : "Create rider"}
            </button>
          </form>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Dispatch board
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Assign riders to ready orders</h3>
          </div>

          <div className="space-y-4">
            {dispatchBoard.readyOrders.map((order) => {
              const assigned = order.delivery?.assignments?.[0] || null;

              return (
                <div key={order.id} className="rounded-lg border border-slate-100 px-4 py-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-slate-900">Order #{order.id}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {order.delivery?.address || "No address"} | {order.stagingLabel || "No label"}
                        {order.stagingZone ? ` | Zone ${order.stagingZone}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      {assigned ? (
                        <>
                          <p className="text-sm text-slate-600">Assigned to {assigned.rider.name}</p>
                          <button
                            type="button"
                            onClick={() => handleStartDispatch(order.id)}
                            disabled={startingDispatchId === order.id}
                            className="btn-primary px-4 py-2"
                          >
                            {startingDispatchId === order.id ? "Starting..." : "Start dispatch"}
                          </button>
                        </>
                      ) : (
                        <select
                          className="field min-w-56"
                          defaultValue=""
                          onChange={(event) => {
                            if (event.target.value) {
                              handleAssignRider(order.id, event.target.value);
                            }
                          }}
                          disabled={assigningOrderId === order.id}
                        >
                          <option value="">Assign rider</option>
                          {dispatchBoard.riders
                            .filter((rider) => rider.isAvailable)
                            .map((rider) => (
                              <option key={rider.id} value={rider.id}>
                                {rider.name} | {rider.vehicleType}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {dispatchBoard.readyOrders.length === 0 ? (
              <p className="text-sm text-slate-500">No ready-for-delivery orders waiting for dispatch.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Receiving
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Receive inventory batches</h3>
          </div>

          <form onSubmit={handleReceiveStock} className="space-y-4">
            <select
              className="field"
              value={receiveForm.productId}
              onChange={(event) =>
                setReceiveForm((current) => ({ ...current, productId: event.target.value }))
              }
              required
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="field"
                type="number"
                placeholder="Quantity received"
                value={receiveForm.quantity}
                onChange={(event) =>
                  setReceiveForm((current) => ({ ...current, quantity: event.target.value }))
                }
                required
              />
              <input
                className="field"
                placeholder="Supplier"
                value={receiveForm.supplier}
                onChange={(event) =>
                  setReceiveForm((current) => ({ ...current, supplier: event.target.value }))
                }
              />
            </div>
            <input
              className="field"
              type="date"
              value={receiveForm.expiresAt}
              onChange={(event) =>
                setReceiveForm((current) => ({ ...current, expiresAt: event.target.value }))
              }
            />
            <button type="submit" disabled={receivingStock} className="btn-primary w-full">
              {receivingStock ? "Receiving..." : "Receive stock"}
            </button>
          </form>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Inventory alerts
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Low stock and near-expiry watch</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-rose-600">Low stock</p>
              <div className="mt-3 space-y-3">
                {inventoryAlerts.lowStock.slice(0, 5).map((item) => (
                  <div key={item.productId} className="rounded-lg border border-slate-100 px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.product?.name}</p>
                    <p className="text-sm text-slate-500">
                      Available {item.availableQty} | Reorder point {item.reorderPoint}
                    </p>
                  </div>
                ))}
                {inventoryAlerts.lowStock.length === 0 ? (
                  <p className="text-sm text-slate-500">No low-stock items right now.</p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-amber-600">Near expiry</p>
              <div className="mt-3 space-y-3">
                {inventoryAlerts.nearExpiry.slice(0, 5).map((item) => {
                  const nextBatch = item.batches.find((batch) => batch.isNearExpiry);
                  return (
                    <div key={item.productId} className="rounded-lg border border-slate-100 px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.product?.name}</p>
                      <p className="text-sm text-slate-500">
                        Batch {nextBatch?.batchCode || "N/A"} expires{" "}
                        {nextBatch?.expiresAt
                          ? new Date(nextBatch.expiresAt).toLocaleDateString("en-PH")
                          : "soon"}
                      </p>
                    </div>
                  );
                })}
                {inventoryAlerts.nearExpiry.length === 0 ? (
                  <p className="text-sm text-slate-500">No near-expiry batches right now.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Staff management
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Create picker and staff accounts</h3>
          </div>

          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <input
              className="field"
              placeholder="Name"
              value={staffForm.name}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={staffForm.email}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
            <input
              className="field"
              placeholder="Phone"
              value={staffForm.phone}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, phone: event.target.value }))
              }
              required
            />
            <input
              className="field"
              type="password"
              placeholder="Password"
              value={staffForm.password}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, password: event.target.value }))
              }
              required
            />
            <button type="submit" disabled={creatingStaff} className="btn-primary w-full">
              {creatingStaff ? "Creating..." : "Create staff account"}
            </button>
          </form>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Rider pool
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Availability and active assignments</h3>
          </div>
          <div className="space-y-4">
            {dispatchBoard.riders.map((rider) => (
              <div key={rider.id} className="rounded-lg border border-slate-100 px-4 py-4 md:flex md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{rider.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {rider.vehicleType} | {rider.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await dispatchApi.updateAvailability(rider.id, !rider.isAvailable);
                    await loadData();
                  }}
                  className={rider.isAvailable ? "btn-secondary px-4 py-2" : "btn-primary px-4 py-2"}
                >
                  {rider.isAvailable ? "Set unavailable" : "Set available"}
                </button>
              </div>
            ))}
            {dispatchBoard.riders.length === 0 ? (
              <p className="text-sm text-slate-500">No riders created yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Delivery time slots
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Generate and monitor delivery windows</h3>
          </div>

          <form onSubmit={handleGenerateSlots} className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-600">Slot date</label>
              <input
                className="field"
                type="date"
                value={slotDate}
                onChange={(event) => setSlotDate(event.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={generatingSlots} className="btn-primary px-5 py-3">
              {generatingSlots ? "Generating..." : "Generate 4 standard shifts"}
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Time</th>
                  <th className="px-3 py-3 font-semibold">Booked</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSlots.map((slot) => (
                  <tr key={slot.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-3">{new Date(slot.date).toLocaleDateString("en-PH")}</td>
                    <td className="px-3 py-3">{slot.startTime} - {slot.endTime}</td>
                    <td className="px-3 py-3">
                      {slot.bookedCount} / {slot.maxOrders}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          slot.isActive
                            ? "font-medium text-emerald-600"
                            : "font-medium text-slate-400"
                        }
                      >
                        {slot.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {upcomingSlots.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No upcoming delivery slots yet.</p>
            ) : null}
          </div>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Active dispatches
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Rider assignments in progress</h3>
          </div>
          <div className="space-y-4">
            {dispatchBoard.activeAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-lg border border-slate-100 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Order #{assignment.order?.id || "N/A"} | {assignment.rider.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {assignment.rider.vehicleType} | Assigned {formatDateTime(assignment.assignedAt)}
                    </p>
                    {assignment.delivery?.estimatedAt ? (
                      <p className="mt-1 text-sm text-slate-500">
                        ETA {formatDateTime(assignment.delivery.estimatedAt)}
                      </p>
                    ) : null}
                    {assignment.rider.lastSeenAt ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Last ping {formatDateTime(assignment.rider.lastSeenAt)}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={assignment.status} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    <p>Pickup: {assignment.pickedUpAt ? formatDateTime(assignment.pickedUpAt) : "Pending"}</p>
                    {assignment.completedAt ? (
                      <p className="mt-1">Completed: {formatDateTime(assignment.completedAt)}</p>
                    ) : null}
                    {assignment.recipientName ? (
                      <p className="mt-1">Recipient: {assignment.recipientName}</p>
                    ) : null}
                    {assignment.proofNote ? (
                      <p className="mt-1">Proof note: {assignment.proofNote}</p>
                    ) : null}
                  </div>

                  {assignment.status === "PICKED_UP" ? (
                    <div className="space-y-3 rounded-lg border border-slate-100 px-3 py-3">
                      <input
                        className="field"
                        placeholder="Recipient name"
                        value={
                          (deliveryActionForms[assignment.id] || createInitialDeliveryActionForm())
                            .recipientName
                        }
                        onChange={(event) =>
                          updateDeliveryActionForm(
                            assignment.id,
                            "recipientName",
                            event.target.value
                          )
                        }
                      />
                      <textarea
                        className="field min-h-24"
                        placeholder="Proof note or failed delivery reason"
                        value={
                          (deliveryActionForms[assignment.id] || createInitialDeliveryActionForm())
                            .proofNote
                        }
                        onChange={(event) =>
                          updateDeliveryActionForm(assignment.id, "proofNote", event.target.value)
                        }
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleCompleteDispatch(assignment)}
                          disabled={completingDispatchId === assignment.id}
                          className="btn-primary px-4 py-2"
                        >
                          {completingDispatchId === assignment.id ? "Completing..." : "Complete delivery"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFailDispatch(assignment)}
                          disabled={failingDispatchId === assignment.id}
                          className="btn-danger px-4 py-2"
                        >
                          {failingDispatchId === assignment.id ? "Saving..." : "Mark failed"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {dispatchBoard.activeAssignments.length === 0 ? (
              <p className="text-sm text-slate-500">No active dispatch assignments right now.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Refund queue
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Partial fulfillment adjustments</h3>
          </div>
          <div className="space-y-4">
            {(dashboard?.pendingRefundOrders || []).map((order) => (
              <div key={order.id} className="rounded-lg border border-slate-100 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Order #{order.id}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.customer.name} | {order.paymentMethod} | {order.paymentStatus}
                    </p>
                    <p className="mt-1 text-sm font-medium text-amber-700">
                      Refund due: {currency(order.refundAmount)}
                    </p>
                    {order.fulfillmentAdjustedAt ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Adjusted {formatDateTime(order.fulfillmentAdjustedAt)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCompleteRefund(order.id)}
                    disabled={completingRefundOrderId === order.id}
                    className="btn-primary px-4 py-2"
                  >
                    {completingRefundOrderId === order.id ? "Saving..." : "Mark refunded"}
                  </button>
                </div>
              </div>
            ))}
            {(dashboard?.pendingRefundOrders || []).length === 0 ? (
              <p className="text-sm text-slate-500">No pending refund adjustments right now.</p>
            ) : null}
          </div>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Recent sales
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Latest order activity</h3>
          </div>
          <div className="space-y-4">
            {dashboard?.recentOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-slate-100 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Order #{order.id}</p>
                    <p className="text-sm text-slate-500">{order.customer.name}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">{formatDateTime(order.createdAt)}</span>
                  <span className="font-semibold text-slate-900">{currency(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Fulfillment
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Update order status</h3>
          </div>
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-slate-100 px-4 py-4 md:flex md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-slate-900">Order #{order.id}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {order.delivery?.address || "No delivery address available"}
                  </p>
                </div>
                <select
                  value={order.status}
                  onChange={(event) => handleStatusChange(order.id, event.target.value)}
                  className="field mt-4 w-full md:mt-0 md:max-w-52"
                >
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PACKING">Packing</option>
                  <option value="READY_FOR_DELIVERY">Ready for delivery</option>
                  <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Packing
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Pack and stage ready orders</h3>
          </div>

          <form onSubmit={handleMarkPacked} className="space-y-4">
            <select
              className="field"
              value={packingForm.orderId || ""}
              onChange={(event) =>
                setPackingForm((current) => ({
                  ...current,
                  orderId: Number(event.target.value) || null
                }))
              }
              required
            >
              <option value="">Select packing order</option>
              {orders
                .filter((order) => order.status === "PACKING")
                .map((order) => (
                  <option key={order.id} value={order.id}>
                    Order #{order.id}
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
            <button type="submit" disabled={Boolean(packingOrderId)} className="btn-primary w-full">
              {packingOrderId ? "Saving..." : "Mark packed"}
            </button>
          </form>
        </div>

        <div className="panel px-6 py-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Staging board
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Ready-for-dispatch handoff</h3>
          </div>

          <div className="space-y-4">
            {orders
              .filter((order) => order.status === "PACKING" || order.status === "READY_FOR_DELIVERY")
              .map((order) => (
                <div key={order.id} className="rounded-lg border border-slate-100 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-slate-900">Order #{order.id}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {order.stagingLabel || "No staging label yet"}
                        {order.stagingZone ? ` • Zone ${order.stagingZone}` : ""}
                      </p>
                    </div>
                    {order.status === "PACKING" && order.packedAt ? (
                      <button
                        type="button"
                        onClick={() => handleMarkReady(order.id)}
                        disabled={readyingOrderId === order.id}
                        className="btn-primary px-4 py-2"
                      >
                        {readyingOrderId === order.id ? "Updating..." : "Mark ready"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            {orders.filter((order) => order.status === "PACKING" || order.status === "READY_FOR_DELIVERY").length === 0 ? (
              <p className="text-sm text-slate-500">No packing or staging orders yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, valueClassName = "text-ink" }) {
  return (
    <div className="panel px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

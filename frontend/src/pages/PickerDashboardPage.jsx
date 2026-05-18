import { useCallback, useEffect, useState } from "react";
import { dispatchApi } from "../api/dispatchApi";
import { pickerApi } from "../api/pickerApi";
import { productApi } from "../api/productApi";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { useOrderRealtime } from "../hooks/useOrderRealtime";
import { currency, formatDateTime } from "../utils/format";

const initialSubstituteForm = {
  orderId: null,
  itemId: null,
  substituteProductId: "",
  note: ""
};

const initialPickForm = {
  orderId: null,
  itemId: null,
  quantity: "",
  scannedBarcode: "",
  unavailableNote: ""
};

const initialLocationForm = {
  latitude: "",
  longitude: ""
};

export function PickerDashboardPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [substituteForm, setSubstituteForm] = useState(initialSubstituteForm);
  const [pickForm, setPickForm] = useState(initialPickForm);
  const [locationForm, setLocationForm] = useState(initialLocationForm);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [orderData, productResult, dispatchAssignment] = await Promise.all([
        pickerApi.getOrders(),
        productApi.list(),
        dispatchApi.myActiveDispatch().catch(() => null)
      ]);
      setOrders(orderData);
      setProducts(productResult.products);
      setActiveDispatch(dispatchAssignment);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load picker dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeDispatch?.rider) {
      return;
    }

    setLocationForm({
      latitude:
        activeDispatch.rider.currentLatitude !== null &&
        activeDispatch.rider.currentLatitude !== undefined
          ? String(activeDispatch.rider.currentLatitude)
          : "",
      longitude:
        activeDispatch.rider.currentLongitude !== null &&
        activeDispatch.rider.currentLongitude !== undefined
          ? String(activeDispatch.rider.currentLongitude)
          : ""
    });
  }, [activeDispatch]);

  const { isConnected } = useOrderRealtime(
    useCallback(
      async (event) => {
        setLiveMessage(`Order #${event.orderId} changed: ${event.type.replaceAll("_", " ")}.`);
        await loadData();
      },
      [loadData]
    )
  );

  const handleClaim = async (orderId) => {
    setError("");
    setSuccess("");
    try {
      await pickerApi.claimOrder(orderId);
      setSuccess(`Order #${orderId} claimed successfully.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to claim order.");
    }
  };

  const handlePickItem = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await pickerApi.pickItem(pickForm.orderId, pickForm.itemId, {
        quantity: Number(pickForm.quantity),
        scannedBarcode: pickForm.scannedBarcode || null
      });
      setSuccess("Item picking progress updated.");
      setPickForm(initialPickForm);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update picked item.");
    }
  };

  const handleMarkUnavailable = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await pickerApi.markUnavailable(pickForm.orderId, pickForm.itemId, {
        note: pickForm.unavailableNote
      });
      setSuccess("Item marked as unavailable.");
      setPickForm(initialPickForm);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to mark item unavailable.");
    }
  };

  const handleSubstitute = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await pickerApi.substituteItem(substituteForm.orderId, substituteForm.itemId, {
        substituteProductId: Number(substituteForm.substituteProductId),
        note: substituteForm.note
      });
      setSuccess("Item substituted successfully. Order total recalculated.");
      setSubstituteForm(initialSubstituteForm);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to substitute item.");
    }
  };

  const handleUpdateLocation = async (event) => {
    event.preventDefault();
    setUpdatingLocation(true);
    setError("");
    setSuccess("");

    try {
      const response = await dispatchApi.updateMyLocation({
        latitude: Number(locationForm.latitude),
        longitude: Number(locationForm.longitude)
      });
      setActiveDispatch(response.assignment);
      setSuccess("Live rider location updated.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update rider location.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError("This device does not support browser geolocation.");
      return;
    }

    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationForm({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        });
      },
      () => {
        setError("Unable to access your current location. You can enter coordinates manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  };

  if (loading) {
    return <LoadingState label="Loading picker dashboard..." />;
  }

  if (orders.length === 0 && !activeDispatch) {
    return (
      <EmptyState
        title="No orders to pick"
        description="There are no confirmed picking tasks or active rider dispatches at this time."
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg bg-white/70 px-6 py-6 backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
            Picker
          </p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Order fulfillment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Claim orders, scan items, track pick progress, and manage substitutions.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="panel px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Unclaimed</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {orders.filter((order) => !order.pickerId).length}
            </p>
          </div>
          <div className="panel px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">My Orders</p>
            <p className="mt-1 text-2xl font-bold text-brand-600">
              {orders.filter((order) => order.pickerId).length}
            </p>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}
      <p className="text-sm text-slate-500">
        Live picker updates are {isConnected ? "connected" : "connecting"}.
        {liveMessage ? ` ${liveMessage}` : ""}
      </p>

      {activeDispatch ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <div className="panel px-6 py-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Active delivery
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">
              Order #{activeDispatch.order?.id}
            </h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <p className="font-medium text-slate-800">Customer</p>
                <p className="mt-1">{activeDispatch.order?.customer?.name || "Walk-in customer"}</p>
              </div>
              <div>
                <p className="font-medium text-slate-800">Status</p>
                <div className="mt-2">
                  <StatusBadge status={activeDispatch.status} />
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="font-medium text-slate-800">Address</p>
                <p className="mt-1">{activeDispatch.delivery?.address || "No delivery address"}</p>
              </div>
              <div>
                <p className="font-medium text-slate-800">ETA</p>
                <p className="mt-1">
                  {activeDispatch.delivery?.estimatedAt
                    ? formatDateTime(activeDispatch.delivery.estimatedAt)
                    : "Waiting for live rider location"}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-800">Last location ping</p>
                <p className="mt-1">
                  {activeDispatch.rider?.lastSeenAt
                    ? formatDateTime(activeDispatch.rider.lastSeenAt)
                    : "Not shared yet"}
                </p>
              </div>
              {activeDispatch.rider?.currentLatitude !== null &&
              activeDispatch.rider?.currentLongitude !== null ? (
                <div className="md:col-span-2">
                  <p className="font-medium text-slate-800">Current coordinates</p>
                  <p className="mt-1">
                    {Number(activeDispatch.rider.currentLatitude).toFixed(6)},{" "}
                    {Number(activeDispatch.rider.currentLongitude).toFixed(6)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel px-6 py-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Live tracking
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">Update rider location</h3>
            <p className="mt-2 text-sm text-slate-500">
              Share a location ping to refresh the customer ETA and dispatch visibility.
            </p>
            <form onSubmit={handleUpdateLocation} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="field"
                  type="number"
                  step="0.000001"
                  placeholder="Latitude"
                  value={locationForm.latitude}
                  onChange={(event) =>
                    setLocationForm((current) => ({ ...current, latitude: event.target.value }))
                  }
                  required
                />
                <input
                  className="field"
                  type="number"
                  step="0.000001"
                  placeholder="Longitude"
                  value={locationForm.longitude}
                  onChange={(event) =>
                    setLocationForm((current) => ({ ...current, longitude: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleUseBrowserLocation}
                  className="btn-secondary px-4 py-2"
                >
                  Use current device location
                </button>
                <button
                  type="submit"
                  disabled={updatingLocation}
                  className="btn-primary px-4 py-2"
                >
                  {updatingLocation ? "Updating..." : "Send live location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="panel px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold text-slate-900">Order #{order.id}</p>
                    <StatusBadge status={order.status} />
                    {!order.pickerId ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Unclaimed
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {order.customer?.name} • {formatDateTime(order.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {order.delivery?.address ? (
                  <p className="max-w-xs truncate text-xs text-slate-500" title={order.delivery.address}>
                    {order.delivery.address}
                  </p>
                ) : null}
                {!order.pickerId ? (
                  <button
                    type="button"
                    onClick={() => handleClaim(order.id)}
                    className="btn-primary px-4 py-2"
                  >
                    Claim order
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="btn-secondary px-4 py-2"
                  >
                    {expandedOrder === order.id ? "Collapse" : "View items"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="text-slate-500">
                Items: <strong className="text-slate-800">{order.items?.length || 0}</strong>
              </span>
              <span className="text-slate-500">
                Progress:{" "}
                <strong className="text-slate-800">
                  {order.pickProgress?.pickedQty || 0}/{order.pickProgress?.requestedQty || 0}
                </strong>
              </span>
              <span className="text-slate-500">
                Completion:{" "}
                <strong className="text-slate-800">{order.pickProgress?.percent || 0}%</strong>
              </span>
              <span className="text-slate-500">
                Total: <strong className="text-brand-700">{currency(order.total)}</strong>
              </span>
              {order.deliverySlot ? (
                <span className="text-slate-500">
                  {order.deliverySlot.startTime} - {order.deliverySlot.endTime}
                </span>
              ) : null}
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${order.pickProgress?.percent || 0}%` }}
              />
            </div>

            {expandedOrder === order.id && order.pickerId ? (
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Pick list
                </h4>

                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-100 px-4 py-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{item.product?.name}</p>
                        <p className="text-sm text-slate-500">
                          Requested {item.quantity} | Picked {item.pickedQty} | Status {item.pickStatus}
                        </p>
                        {item.product?.barcode ? (
                          <p className="mt-1 text-xs text-slate-400">Expected barcode: {item.product.barcode}</p>
                        ) : null}
                        {item.pickIssueNote ? (
                          <p className="mt-1 text-xs font-medium text-rose-600">{item.pickIssueNote}</p>
                        ) : null}
                        {item.substituteProduct ? (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            Substituted with {item.substituteProduct.name}
                            {item.substitutionNote ? ` - ${item.substitutionNote}` : ""}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPickForm({
                              orderId: order.id,
                              itemId: item.id,
                              quantity: String(item.quantity),
                              scannedBarcode: item.scannedBarcode || "",
                              unavailableNote: ""
                            })
                          }
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          Pick / Scan
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPickForm({
                              orderId: order.id,
                              itemId: item.id,
                              quantity: "",
                              scannedBarcode: "",
                              unavailableNote: item.pickIssueNote || ""
                            })
                          }
                          className="btn-danger px-3 py-1.5 text-xs"
                        >
                          Unavailable
                        </button>
                        {!item.substituteProductId ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSubstituteForm({
                                orderId: order.id,
                                itemId: item.id,
                                substituteProductId: "",
                                note: ""
                              })
                            }
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            Substitute
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {pickForm.orderId === order.id && pickForm.itemId === item.id ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <form
                          onSubmit={handlePickItem}
                          className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4"
                        >
                          <p className="text-sm font-semibold text-emerald-800">Mark item picked</p>
                          <input
                            className="field"
                            type="number"
                            min="1"
                            max={item.quantity}
                            placeholder="Picked quantity"
                            value={pickForm.quantity}
                            onChange={(event) =>
                              setPickForm((current) => ({ ...current, quantity: event.target.value }))
                            }
                            required
                          />
                          <input
                            className="field"
                            placeholder="Scanned barcode (optional)"
                            value={pickForm.scannedBarcode}
                            onChange={(event) =>
                              setPickForm((current) => ({
                                ...current,
                                scannedBarcode: event.target.value
                              }))
                            }
                          />
                          <div className="flex gap-2">
                            <button type="submit" className="btn-primary px-4 py-2 text-sm">
                              Save pick
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickForm(initialPickForm)}
                              className="btn-secondary px-4 py-2 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>

                        <form
                          onSubmit={handleMarkUnavailable}
                          className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-4"
                        >
                          <p className="text-sm font-semibold text-rose-800">Mark unavailable</p>
                          <input
                            className="field"
                            placeholder="Reason item is unavailable"
                            value={pickForm.unavailableNote}
                            onChange={(event) =>
                              setPickForm((current) => ({
                                ...current,
                                unavailableNote: event.target.value
                              }))
                            }
                            required
                          />
                          <button type="submit" className="btn-danger px-4 py-2 text-sm">
                            Confirm unavailable
                          </button>
                        </form>
                      </div>
                    ) : null}

                    {substituteForm.orderId === order.id && substituteForm.itemId === item.id ? (
                      <form
                        onSubmit={handleSubstitute}
                        className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4"
                      >
                        <p className="text-sm font-semibold text-amber-800">
                          Substitute item #{substituteForm.itemId}
                        </p>
                        <select
                          className="field"
                          value={substituteForm.substituteProductId}
                          onChange={(event) =>
                            setSubstituteForm((current) => ({
                              ...current,
                              substituteProductId: event.target.value
                            }))
                          }
                          required
                        >
                          <option value="">Select replacement product</option>
                          {products
                            .filter((product) => product.stock > 0)
                            .map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {currency(product.price)} (Stock: {product.stock})
                              </option>
                            ))}
                        </select>
                        <input
                          className="field"
                          placeholder="Reason for substitution (optional)"
                          value={substituteForm.note}
                          onChange={(event) =>
                            setSubstituteForm((current) => ({
                              ...current,
                              note: event.target.value
                            }))
                          }
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary px-4 py-2 text-sm">
                            Confirm substitution
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubstituteForm(initialSubstituteForm)}
                            className="btn-secondary px-4 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

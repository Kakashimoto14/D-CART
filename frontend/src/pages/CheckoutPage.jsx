import { Clock3, CreditCard, MapPinned, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deliverySlotApi } from "../api/deliverySlotApi";
import { geofencingApi } from "../api/geofencingApi";
import { orderApi } from "../api/orderApi";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { useAuth } from "../hooks/useAuth.js";
import { useCustomer } from "../hooks/useCustomer.js";
import { currency } from "../utils/format";

const ADDRESS_KEY = "dcart_delivery_address";
const STEPS = [
  { id: 1, title: "Delivery details" },
  { id: 2, title: "Schedule" },
  { id: 3, title: "Payment" },
  { id: 4, title: "Review" }
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, isCartReady, registerOrder } = useCustomer();
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoResult, setGeoResult] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    address: window.localStorage.getItem(ADDRESS_KEY) || "",
    deliveryType: "SAME_DAY",
    substitutionPreference: "BEST_MATCH",
    paymentMethod: "COD",
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    deliverySlotId: ""
  }));

  const requestDeliveryQuote = async ({
    latitude,
    longitude,
    accuracyMeters,
    deliveryType,
    deliverySlotId,
    orderSubtotal
  }) => {
    setLoadingQuote(true);

    try {
      const result = await geofencingApi.validateLocation({
        latitude,
        longitude,
        accuracyMeters,
        deliveryType,
        deliverySlotId,
        orderSubtotal
      });

      setGeoResult(result);

      if (result.decision === "OUTSIDE_RADIUS") {
        setError(
          `Your location is ${result.displayDistanceKm}km away. Delivery is only available within ${result.store.deliveryRadius}km of the store.`
        );
      } else if (result.decision === "UNCERTAIN") {
        setError(result.reason || "Your GPS fix is not accurate enough yet. Please try again.");
      } else if (result.scheduling?.isEligible === false) {
        setError(result.scheduling.reason || "The selected delivery schedule is not available.");
      } else {
        setError("");
      }

      return result;
    } finally {
      setLoadingQuote(false);
    }
  };

  useEffect(() => {
    const loadSlots = async () => {
      try {
        const slotData = await deliverySlotApi
          .getAvailable(undefined, undefined, form.deliveryType)
          .catch(() => []);
        setSlots(slotData);

        if (slotData.length === 1) {
          setForm((current) => ({ ...current, deliverySlotId: String(slotData[0].id) }));
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load checkout schedules.");
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [form.deliveryType]);

  useEffect(() => {
    window.localStorage.setItem(ADDRESS_KEY, form.address);
  }, [form.address]);

  useEffect(() => {
    if (!cart?.subtotal || form.latitude === null || form.longitude === null) {
      return;
    }

    requestDeliveryQuote({
      latitude: form.latitude,
      longitude: form.longitude,
      accuracyMeters: form.accuracyMeters,
      deliveryType: form.deliveryType,
      deliverySlotId: form.deliverySlotId ? Number(form.deliverySlotId) : null,
      orderSubtotal: cart.subtotal
    }).catch(() => {
      setError("Unable to refresh your delivery quote. Please try again.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.subtotal, form.deliveryType, form.deliverySlotId]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setError("");
    setSuccess("");
    setGeoResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracyMeters = position.coords.accuracy || null;

        setForm((current) => ({
          ...current,
          latitude,
          longitude,
          accuracyMeters
        }));

        try {
          await requestDeliveryQuote({
            latitude,
            longitude,
            accuracyMeters,
            deliveryType: form.deliveryType,
            deliverySlotId: form.deliverySlotId ? Number(form.deliverySlotId) : null,
            orderSubtotal: cart?.subtotal || 0
          });
        } catch (_geoError) {
          setError("Unable to verify your location. Please try again.");
          setGeoResult(null);
        }
      },
      () => {
        setError(
          "Unable to detect your location. Please ensure location access is enabled in your browser settings."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const isLocationVerified = geoResult?.isWithinRadius === true;
  const deliveryFee = geoResult?.isWithinRadius ? geoResult.deliveryFee : 0;
  const grandTotal = Number(cart?.subtotal || 0) + Number(deliveryFee || 0);

  const slotsByDate = useMemo(
    () =>
      slots.reduce((accumulator, slot) => {
        const dateKey = new Date(slot.date).toLocaleDateString("en-PH", {
          weekday: "short",
          month: "short",
          day: "numeric"
        });

        if (!accumulator[dateKey]) {
          accumulator[dateKey] = [];
        }

        accumulator[dateKey].push(slot);
        return accumulator;
      }, {}),
    [slots]
  );

  const canContinueStep1 = Boolean(form.address.trim()) && isLocationVerified;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const order = await orderApi.checkout({
        address: form.address,
        deliveryType: form.deliveryType,
        paymentMethod: form.paymentMethod,
        substitutionPreference: form.substitutionPreference,
        latitude: form.latitude,
        longitude: form.longitude,
        accuracyMeters: form.accuracyMeters ?? undefined,
        deliverySlotId: form.deliverySlotId ? Number(form.deliverySlotId) : undefined
      });

      registerOrder(order);

      if (order.paymentMethod === "GCASH" && order.paymentCheckoutUrl) {
        setSuccess("GCash checkout created. Redirecting you to PayMongo now...");
        window.location.href = order.paymentCheckoutUrl;
        return;
      }

      setSuccess(`Order #${order.id} has been placed successfully!`);
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to place the order. Please verify your location and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCartReady || loadingSlots) {
    return <LoadingState label="Preparing checkout..." />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Nothing to check out"
        description="Add items to your cart before placing an order."
        action={
          <Link to="/products" className="btn-primary">
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <div className="section-shell bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(255,240,234,0.95)_100%)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">Checkout</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Simple guided checkout</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            We keep the form short, the summary visible, and the final action obvious.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {STEPS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`rounded-[22px] border px-4 py-3 text-left transition ${
                  step === item.id
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                  Step {item.id}
                </span>
                <span className="mt-1 block text-sm font-semibold">{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

        {step === 1 ? (
          <section className="panel px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <MapPinned className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold text-ink">Delivery details</h3>
                <p className="text-sm text-slate-500">Tell us where to bring your groceries.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <textarea
                name="address"
                rows="3"
                placeholder="House number, street, barangay, city/municipality, province"
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                className="field resize-none"
                required
              />

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Location verification</p>
                    <p className="text-xs text-slate-500">
                      {isLocationVerified
                        ? "Your location is verified and inside our delivery area."
                        : "Verify your location so we can calculate delivery safely."}
                    </p>
                  </div>
                  <button type="button" onClick={detectLocation} className="btn-secondary px-3 py-2 text-sm">
                    {loadingQuote ? "Checking..." : "Detect location"}
                  </button>
                </div>

                {geoResult?.isWithinRadius ? (
                  <div className="mt-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                    <p>
                      You are <strong>{geoResult.displayDistanceKm}km</strong> from the store.
                      Delivery fee: <strong>{currency(geoResult.deliveryFee)}</strong>
                    </p>
                    {geoResult.accuracyMeters ? (
                      <p className="mt-1 text-xs text-emerald-700">
                        GPS accuracy: approximately {Math.round(geoResult.accuracyMeters)} meters
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {geoResult?.decision === "OUTSIDE_RADIUS" ? (
                  <div className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
                    You are outside the delivery radius.
                  </div>
                ) : null}

                {geoResult?.decision === "UNCERTAIN" ? (
                  <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    {geoResult.reason || "Your GPS reading is too imprecise for delivery validation."}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canContinueStep1}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="panel px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Clock3 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold text-ink">Schedule</h3>
                <p className="text-sm text-slate-500">Choose how and when you want delivery.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">Delivery speed</p>
                <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-slate-200 px-4 py-4">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="SAME_DAY"
                    checked={form.deliveryType === "SAME_DAY"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        deliveryType: event.target.value,
                        deliverySlotId: ""
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">Same-day delivery</span>
                    <span className="block text-sm text-slate-500">Fastest available delivery window.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-slate-200 px-4 py-4">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="STANDARD"
                    checked={form.deliveryType === "STANDARD"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        deliveryType: event.target.value,
                        deliverySlotId: ""
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">Standard delivery</span>
                    <span className="block text-sm text-slate-500">Best for planned drop-offs.</span>
                  </span>
                </label>
              </div>

              {Object.keys(slotsByDate).length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Delivery slot (optional)</p>
                  <select
                    value={form.deliverySlotId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, deliverySlotId: event.target.value }))
                    }
                    className="field"
                  >
                    <option value="">No preference (earliest available)</option>
                    {Object.entries(slotsByDate).map(([dateLabel, dateSlots]) => (
                      <optgroup key={dateLabel} label={dateLabel}>
                        {dateSlots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.startTime} - {slot.endTime} ({slot.available} slots left)
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No active delivery slots were returned. We&apos;ll use the earliest available option.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary">
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="panel px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold text-ink">Payment</h3>
                <p className="text-sm text-slate-500">COD stays available if GCash is unavailable.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-slate-200 px-4 py-4">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={form.paymentMethod === "COD"}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, paymentMethod: event.target.value }))
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-slate-900">Cash on Delivery</span>
                  <span className="block text-sm text-slate-500">
                    Pay when your groceries arrive.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-slate-200 px-4 py-4">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="GCASH"
                  checked={form.paymentMethod === "GCASH"}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, paymentMethod: event.target.value }))
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-slate-900">GCash via PayMongo</span>
                  <span className="block text-sm text-slate-500">
                    Secure hosted checkout. If it&apos;s unavailable, COD still works.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                Back
              </button>
              <button type="button" onClick={() => setStep(4)} className="btn-primary">
                Review
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="panel px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold text-ink">Review & place order</h3>
                <p className="text-sm text-slate-500">Everything is ready. Confirm and submit once.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold text-slate-900">{user?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment</span>
                <span className="font-semibold text-slate-900">
                  {form.paymentMethod === "GCASH" ? "GCash via PayMongo" : "Cash on Delivery"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery fee</span>
                <span className="font-semibold text-slate-900">{currency(deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{currency(grandTotal)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep(3)} className="btn-secondary">
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isLocationVerified}
                className="btn-primary"
              >
                {isSubmitting
                  ? "Placing order..."
                  : form.paymentMethod === "GCASH"
                    ? "Pay with GCash"
                    : "Place order"}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="panel h-fit px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            Order summary
          </p>
          <div className="mt-5 space-y-4">
            {cart.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{item.product.name}</p>
                  <p className="text-slate-500">Qty {item.quantity}</p>
                </div>
                <span className="font-semibold text-slate-900">
                  {currency(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-800">{currency(cart.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Delivery</span>
              <span className="font-semibold text-slate-800">{currency(deliveryFee)}</span>
            </div>
            {geoResult?.scheduling?.message ? (
              <div className="text-sm text-slate-500">{geoResult.scheduling.message}</div>
            ) : null}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-sm font-semibold text-slate-600">Total</span>
              <span className="text-lg font-bold text-ink">{currency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="panel px-6 py-6">
          <p className="text-sm font-semibold text-slate-900">Need help?</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Review your cart, then place the order once. The submit button stays locked to prevent duplicates.
          </p>
        </div>
      </aside>
    </form>
  );
}

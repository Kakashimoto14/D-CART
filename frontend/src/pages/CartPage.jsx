import { AlertCircle, ArrowRight, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartItemRow } from "../components/cart/CartItemRow";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { useCustomer } from "../hooks/useCustomer.js";
import { currency } from "../utils/format";

export function CartPage() {
  const { cart, clearCart, isCartReady, removeCartItem, updateCartItem } = useCustomer();
  const [error, setError] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const unavailableItems = useMemo(
    () => cart?.items?.filter((item) => Number(item.product.stock || 0) < Number(item.quantity || 0)) || [],
    [cart?.items]
  );

  const applyMutation = async (action) => {
    setIsMutating(true);
    setError("");

    try {
      await action();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update cart.");
    } finally {
      setIsMutating(false);
    }
  };

  if (!isCartReady) {
    return <LoadingState label="Loading your cart..." />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Start adding grocery items to prepare your same-day order."
        action={
          <Link to="/products" className="btn-primary">
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
      <div className="space-y-4">
        <div className="section-shell bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(255,240,234,0.96)_100%)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="brand-kicker">
                Cart
              </p>
              <h2 className="mt-2 text-3xl font-bold text-ink">Review your basket</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Adjust quantities, remove items, and continue when everything looks right.
              </p>
            </div>
            <button
              type="button"
              onClick={() => applyMutation(() => clearCart())}
              className="text-sm font-semibold text-rose-600"
            >
              Clear cart
            </button>
          </div>
        </div>

        {unavailableItems.length ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Some items now exceed available stock. Please adjust them before continuing to checkout.
              </p>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

        <div className="space-y-3">
          {cart.items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={item}
              busy={isMutating}
              onQuantityChange={(productId, quantity) =>
                applyMutation(() =>
                  quantity <= 0 ? removeCartItem(productId) : updateCartItem(productId, quantity)
                )
              }
              onRemove={(productId) => applyMutation(() => removeCartItem(productId))}
            />
          ))}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="panel h-fit px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <div>
              <p className="brand-kicker">
                Summary
              </p>
              <p className="text-sm text-slate-500">Your order total before delivery.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{currency(cart.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Delivery</span>
              <span className="font-semibold text-slate-900">Calculated at checkout</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900">
              <span>Total so far</span>
              <span>{currency(cart.subtotal)}</span>
            </div>
          </div>

          <Link
            to="/checkout"
            className={`btn-primary mt-8 w-full ${unavailableItems.length ? "pointer-events-none opacity-60" : ""}`}
          >
            Proceed to checkout
          </Link>
          <Link to="/products" className="btn-secondary mt-3 w-full">
            Continue shopping
          </Link>
        </div>

        <div className="fixed inset-x-4 bottom-20 z-40 lg:hidden">
          <Link
            to="/checkout"
            className={`flex items-center justify-between rounded-[24px] bg-ink px-5 py-4 text-white shadow-[0_18px_40px_rgba(13,27,42,0.28)] ${unavailableItems.length ? "pointer-events-none opacity-60" : ""}`}
          >
            <span>
              <span className="block text-xs uppercase tracking-[0.18em] text-slate-300">
                Ready to place
              </span>
              <span className="block text-base font-semibold">{currency(cart.subtotal)}</span>
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              Proceed to checkout
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </aside>
    </section>
  );
}

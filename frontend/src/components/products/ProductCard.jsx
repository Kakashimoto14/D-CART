import { QuantityStepper } from "../customer/QuantityStepper.jsx";
import { currency } from "../../utils/format";

const getAvailability = (stock) => {
  if (stock <= 0) {
    return {
      label: "Out of stock",
      tone: "bg-rose-100 text-rose-700"
    };
  }

  if (stock <= 5) {
    return {
      label: `Low stock • ${stock} left`,
      tone: "bg-amber-100 text-amber-700"
    };
  }

  return {
    label: "In stock",
    tone: "bg-emerald-100 text-emerald-700"
  };
};

export function ProductCard({
  product,
  quantity = 0,
  onAddToCart,
  onIncrease,
  onDecrease,
  busy
}) {
  const initials = product.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const description =
    product.description && product.description.length > 90
      ? `${product.description.slice(0, 87)}...`
      : product.description;
  const availability = getAvailability(Number(product.stock || 0));
  const isOutOfStock = Number(product.stock || 0) <= 0;

  return (
    <article className="panel overflow-hidden">
      <div className="relative h-48 overflow-hidden bg-mesh-soft">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 via-white to-brand-200">
            <span className="text-4xl font-bold tracking-[0.12em] text-brand-700">
              {initials || "DG"}
            </span>
          </div>
        )}
        <div
          className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${availability.tone}`}
        >
          {availability.label}
        </div>
      </div>
      <div className="space-y-5 px-5 py-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            {product.category?.name || "General"}
          </p>
          <h3 className="text-xl font-semibold text-ink">{product.name}</h3>
          <p className="min-h-[2.5rem] text-sm leading-5 text-slate-500">
            {description || "Fresh grocery item ready for delivery."}
          </p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Unit price</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {currency(product.price)} / {product.unit || "pc"}
            </p>
            {product.weight ? (
              <p className="mt-1 text-xs text-slate-400">{product.weight} {product.unit}</p>
            ) : null}
          </div>
          {quantity > 0 ? (
            <div className="text-right">
              <QuantityStepper
                value={quantity}
                min={0}
                max={Number(product.stock || 0)}
                onDecrease={onDecrease}
                onIncrease={onIncrease}
                disabled={busy}
              />
              <p className="mt-2 text-xs font-medium text-slate-500">
                {busy ? "Updating cart..." : "In your cart"}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAddToCart}
              disabled={busy || isOutOfStock}
              className="btn-primary px-4 py-2.5"
            >
              {busy ? "Adding..." : isOutOfStock ? "Unavailable" : "Add to cart"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

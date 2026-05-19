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
      label: `Low stock - ${stock} left`,
      tone: "bg-amber-100 text-amber-700"
    };
  }

  return {
    label: "In stock",
    tone: "bg-grocery-100 text-grocery-700"
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
    <article className="overflow-hidden rounded-[16px] border border-white/80 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-panel">
      <div className="relative h-28 overflow-hidden bg-mesh-soft sm:h-32">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grocery-placeholder flex h-full items-center justify-center">
            <span className="rounded-full bg-white/80 px-3 py-2 text-lg font-bold tracking-[0.08em] text-brand-600 shadow-sm">
              {initials || "DG"}
            </span>
          </div>
        )}
        <div
          className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm ${availability.tone}`}
        >
          {availability.label}
        </div>
      </div>
      <div className="space-y-2.5 px-3 py-3">
        <div className="space-y-0.5">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            {product.category?.name || "General"}
          </p>
          <h3 className="line-clamp-2 min-h-9 text-[13px] font-bold leading-[18px] text-ink sm:text-sm">
            {product.name}
          </h3>
          <p className="hidden truncate text-xs leading-4 text-slate-500 sm:block">
            {description || "Fresh grocery item ready for delivery."}
          </p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
              per {product.unit || "pc"}
            </p>
            <p className="mt-0.5 text-base font-extrabold text-slate-900 sm:text-lg">
              {currency(product.price)}
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
                compact
              />
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {busy ? "Updating cart..." : "In your cart"}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAddToCart}
              disabled={busy || isOutOfStock}
              className="btn-primary rounded-full px-3 py-2 text-xs"
            >
              {busy ? "Adding..." : isOutOfStock ? "Out" : "Add"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

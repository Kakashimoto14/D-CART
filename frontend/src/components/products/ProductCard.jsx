import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(product.image) && !imageFailed;
  const isWholesale =
    product.description?.toLowerCase().includes("wholesale-ready") ||
    ["sack", "case", "box"].includes(String(product.unit || "").toLowerCase());
  const isAgeRestricted =
    product.category?.name === "Alcoholic Beverages" ||
    product.description?.toLowerCase().includes("age-restricted");

  useEffect(() => {
    setImageFailed(false);
  }, [product.image]);

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
    <article className="overflow-hidden rounded-[14px] border border-white/80 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-panel">
      <div className="relative h-24 overflow-hidden bg-mesh-soft sm:h-28">
        {hasImage ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="grocery-placeholder flex h-full items-center justify-center">
            {initials ? (
              <span className="rounded-full bg-white/80 px-3 py-2 text-lg font-bold tracking-[0.08em] text-brand-600 shadow-sm">
                {initials}
              </span>
            ) : (
              <ImageIcon className="h-7 w-7 text-brand-400" />
            )}
          </div>
        )}
        <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm ${availability.tone}`}>
            {availability.label}
          </span>
          {isWholesale ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800 shadow-sm">
              Wholesale
            </span>
          ) : null}
          {isAgeRestricted ? (
            <span className="rounded-full bg-slate-900/85 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
              18+
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-2 px-3 py-3">
        <div className="space-y-0.5">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            {product.category?.name || "General"}
          </p>
          <h3 className="line-clamp-2 min-h-9 text-[13px] font-bold leading-[18px] text-ink">
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
            <p className="mt-0.5 text-base font-extrabold text-slate-900">
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

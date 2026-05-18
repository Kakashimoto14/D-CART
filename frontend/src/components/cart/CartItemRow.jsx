import { Trash2 } from "lucide-react";
import { QuantityStepper } from "../customer/QuantityStepper.jsx";
import { currency } from "../../utils/format";

export function CartItemRow({ item, onQuantityChange, onRemove, busy }) {
  const hasAvailabilityIssue = Number(item.product.stock || 0) < Number(item.quantity || 0);

  return (
    <div className="grid gap-4 rounded-[24px] border border-slate-100 bg-white px-4 py-4 md:grid-cols-[1.7fr_0.7fr_0.9fr_auto] md:items-center">
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900">{item.product.name}</h3>
        <p className="text-sm text-slate-500">{item.product.category?.name || "General"}</p>
        {hasAvailabilityIssue ? (
          <p className="mt-2 text-sm font-medium text-rose-600">
            Only {item.product.stock} left in stock. Please adjust before checkout.
          </p>
        ) : null}
      </div>
      <p className="text-sm font-medium text-slate-700">{currency(item.product.price)}</p>
      <div className="flex">
        <QuantityStepper
          value={item.quantity}
          min={1}
          max={Number(item.product.stock || 0)}
          compact
          disabled={busy}
          onDecrease={() => onQuantityChange(item.productId, item.quantity - 1)}
          onIncrease={() => onQuantityChange(item.productId, item.quantity + 1)}
        />
      </div>
      <div className="flex justify-start md:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => onRemove(item.productId)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 transition hover:text-rose-700"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </button>
      </div>
    </div>
  );
}

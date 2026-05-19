import { ShoppingBasket } from "lucide-react";
import { Link } from "react-router-dom";
import { currency } from "../../utils/format";

export function StickyCartBar({ itemCount, subtotal }) {
  if (!itemCount) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-[4.7rem] z-40 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[360px]">
      <Link
        to="/cart"
        className="flex items-center justify-between rounded-[18px] bg-ink px-4 py-3 text-white shadow-[0_18px_40px_rgba(13,27,42,0.28)] transition hover:-translate-y-0.5"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
            <ShoppingBasket className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">
              {itemCount} {itemCount === 1 ? "item" : "items"} - {currency(subtotal)}
            </span>
            <span className="block text-xs text-slate-300">Ready when you are</span>
          </span>
        </span>
        <span className="rounded-full bg-brand-500 px-3 py-2 text-sm font-semibold">Checkout</span>
      </Link>
    </div>
  );
}

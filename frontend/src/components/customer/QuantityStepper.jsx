import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled = false,
  compact = false,
  onDecrease,
  onIncrease
}) {
  const containerClass = compact ? "h-10 rounded-2xl" : "h-11 rounded-[18px]";
  const buttonClass = compact ? "h-8 w-8" : "h-9 w-9";

  return (
    <div
      className={`inline-flex items-center gap-1 border border-slate-200 bg-white px-1.5 shadow-sm ${containerClass}`}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled || value <= min}
        className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 ${buttonClass}`}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-9 text-center text-sm font-semibold text-slate-900">{value}</span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled || (typeof max === "number" && value >= max)}
        className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 ${buttonClass}`}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

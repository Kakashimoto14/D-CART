const toneMap = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-sky-100 text-sky-800",
  PACKING: "bg-violet-100 text-violet-800",
  OUT_FOR_DELIVERY: "bg-brand-100 text-brand-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  SCHEDULED: "bg-brand-100 text-brand-800",
  SENT: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-800",
  SKIPPED: "bg-amber-100 text-amber-800"
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        toneMap[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {String(status).replaceAll("_", " ")}
    </span>
  );
}

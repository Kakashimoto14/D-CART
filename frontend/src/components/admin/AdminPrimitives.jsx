import { motion } from "framer-motion";
import { Search } from "lucide-react";

export function PageHero({ eyebrow, title, description, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[18px] border border-white/80 bg-white/90 p-5 shadow-panel"
    >
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="brand-kicker">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </motion.div>
  );
}

export function StatCard({ label, value, hint, tone = "default", icon: Icon }) {
  const toneClassName = {
    default: "from-white to-brand-50/50 text-ink",
    success: "from-white to-emerald-50 text-emerald-800",
    warning: "from-white to-amber-50 text-amber-800",
    danger: "from-white to-rose-50 text-rose-800"
  }[tone];

  return (
    <div className={`rounded-[22px] border border-white/80 bg-gradient-to-br ${toneClassName} p-5 shadow-panel`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
          {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl bg-white/80 p-3 text-brand-600 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionCard({ title, description, action, children, className = "" }) {
  return (
    <section className={`panel rounded-[22px] border border-white/80 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-3">{action}</div> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export function FilterToolbar({ searchValue, onSearchChange, searchPlaceholder, children }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <label className="relative block w-full max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="field pl-11"
        />
      </label>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

export function DataTable({ columns, rows, empty, renderRow }) {
  if (!rows.length) {
    return <p className="py-10 text-sm text-slate-500">{empty}</p>;
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-100">
      <div className="hidden bg-slate-50/90 px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-slate-500 md:grid md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]">
        {columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>
      <div className="divide-y divide-slate-100">{rows.map(renderRow)}</div>
    </div>
  );
}

export function FormSection({ title, description, children }) {
  return (
    <div className="space-y-4 rounded-[20px] border border-slate-100 bg-slate-50/70 p-5">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-ink">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function HealthMeter({ label, value, total, tone = "brand" }) {
  const safeTotal = Math.max(total || 0, 1);
  const percent = Math.max(0, Math.min(100, Math.round((value / safeTotal) * 100)));
  const barClassName = {
    brand: "bg-brand-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    success: "bg-emerald-500"
  }[tone];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value}/{total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function PlaceholderModule({ title, description }) {
  return (
    <div className="panel rounded-[24px] border border-dashed border-brand-200 bg-[rgba(255,255,255,0.85)] p-10 text-center">
      <div className="mx-auto max-w-xl space-y-4">
        <span className="inline-flex rounded-full bg-brand-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
          Workspace module
        </span>
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

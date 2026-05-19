import { Bell, Menu, Search, Sparkles } from "lucide-react";

export function AdminTopbar({ title, subtitle, user, onMenuClick }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/75 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className="inline-flex rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 xl:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
                D&apos;Cart operations
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {title}
              </h1>
              {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600"
            >
              <Sparkles className="h-4 w-4" />
              Quick actions
            </button>
            <button
              type="button"
              className="inline-flex rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:max-w-xl lg:flex-1">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search modules, products, orders, notifications"
              className="w-full border-0 bg-transparent p-0 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-emerald-950/5 bg-gradient-to-r from-brand-50 to-white px-4 py-3 shadow-sm lg:min-w-[280px]">
            <div>
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{user?.role}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-sm font-bold text-white shadow-lg shadow-brand-900/15">
              {user?.name?.[0] || "D"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

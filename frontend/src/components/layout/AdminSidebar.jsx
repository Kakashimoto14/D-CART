import { AnimatePresence, motion } from "framer-motion";
import { Leaf, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink } from "react-router-dom";

function SidebarLink({ item, compact = false, onNavigate }) {
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <div
        className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-400 ${
          compact ? "justify-center" : ""
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!compact ? (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {item.badge}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition duration-200 ${
          isActive
            ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-900/20"
            : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
        } ${compact ? "justify-center" : ""}`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!compact ? (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge ? (
            <span className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
              {item.badge}
            </span>
          ) : null}
        </>
      ) : null}
    </NavLink>
  );
}

function SidebarBody({ links, utilityLinks, compact, onNavigate, onToggleCompact }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-emerald-900/10 px-5 py-5">
        <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/20">
            <Leaf className="h-5 w-5" />
          </div>
          {!compact ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
                D&apos;Cart
              </p>
              <p className="text-sm font-semibold text-ink">Fresh operations</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleCompact}
          className="hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-brand-200 hover:text-brand-700 xl:inline-flex"
          aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
        >
          {compact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-1">
          {!compact ? (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Operations
            </p>
          ) : null}
          {links.map((item) => (
            <SidebarLink
              key={item.to}
              item={item}
              compact={compact}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {utilityLinks?.length ? (
          <div className="mt-8 space-y-1">
            {!compact ? (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Utility
              </p>
            ) : null}
            {utilityLinks.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                compact={compact}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="border-t border-emerald-900/10 px-5 py-5">
          <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-4">
            <p className="text-sm font-semibold text-ink">Store pulse</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Keep inventory fresh, fulfillment smooth, and delivery windows visible in one place.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminSidebar({
  links,
  utilityLinks,
  compact,
  setCompact,
  mobileOpen,
  setMobileOpen
}) {
  return (
    <>
      <aside
        className={`hidden border-r border-white/70 bg-white/90 backdrop-blur-xl xl:flex ${
          compact ? "w-24" : "w-80"
        }`}
      >
        <SidebarBody
          links={links}
          utilityLinks={utilityLinks}
          compact={compact}
          onToggleCompact={() => setCompact((value) => !value)}
        />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-slate-950/40 xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm border-r border-white/70 bg-white/95 backdrop-blur-xl xl:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <SidebarBody
                links={links}
                utilityLinks={utilityLinks}
                compact={false}
                onNavigate={() => setMobileOpen(false)}
                onToggleCompact={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

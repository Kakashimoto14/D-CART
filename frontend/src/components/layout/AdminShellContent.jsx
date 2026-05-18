import { Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

const pageMeta = {
  "/admin": {
    title: "Operations Dashboard",
    subtitle: "A live overview of sales, fulfillment, inventory, and operational recovery."
  },
  "/admin/products": {
    title: "Product Management",
    subtitle: "Catalog upkeep, pricing, availability, and category organization."
  },
  "/admin/categories": {
    title: "Categories",
    subtitle: "Merchandise grouping and storefront structure."
  },
  "/admin/inventory": {
    title: "Inventory Control",
    subtitle: "Stock health, receiving, expiry pressure, and reservation maintenance."
  },
  "/admin/orders": {
    title: "Order Operations",
    subtitle: "Refund handling, packing handoff, rider assignment, and delivery control."
  },
  "/admin/analytics": {
    title: "Sales Analytics",
    subtitle: "Revenue, order rhythm, top movers, and operational throughput."
  },
  "/admin/notifications": {
    title: "Notifications & Audit",
    subtitle: "Customer communication reliability and admin recovery traceability."
  },
  "/admin/customers": {
    title: "Customers",
    subtitle: "Future-ready customer operations module."
  },
  "/admin/suppliers": {
    title: "Suppliers",
    subtitle: "Future-ready supplier coordination module."
  },
  "/admin/settings": {
    title: "Settings",
    subtitle: "Future-ready system configuration module."
  },
  "/picker": {
    title: "Picker Operations",
    subtitle: "Picking, substitutions, dispatch location updates, and order handling."
  }
};

export function AdminShellContent({ user, logout, links, utilityLinks }) {
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const meta = useMemo(() => pageMeta[location.pathname] || pageMeta["/admin"], [location.pathname]);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(68,181,146,0.18),transparent_18%),linear-gradient(180deg,#f7fbf8_0%,#eef6f1_100%)]">
      <AdminSidebar
        links={links}
        utilityLinks={utilityLinks}
        compact={compact}
        setCompact={setCompact}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopbar
          title={meta.title}
          subtitle={meta.subtitle}
          user={user}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <div className="border-t border-white/70 bg-white/70 px-4 py-4 text-xs text-slate-400 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <p>D&apos;Cart admin workspace</p>
            <button type="button" onClick={logout} className="font-semibold text-slate-500 transition hover:text-brand-700">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

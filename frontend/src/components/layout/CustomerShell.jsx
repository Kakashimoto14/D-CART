import { ClipboardList, Home, LogOut, ShoppingBasket, ShoppingCart, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CustomerProvider } from "../../context/CustomerContext.jsx";
import { useCustomer } from "../../hooks/useCustomer.js";
import { CustomerToastRegion } from "../customer/CustomerToastRegion.jsx";
import { StickyCartBar } from "../customer/StickyCartBar.jsx";

const mobileNavigation = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/products", label: "Shop", icon: ShoppingBasket },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/account", label: "Account", icon: UserRound }
];

function CustomerLayout({ user, logout }) {
  const location = useLocation();
  const { activeOrder, cartCount, cartSubtotal, toast } = useCustomer();

  const showStickyCart =
    cartCount > 0 && location.pathname !== "/cart" && !location.pathname.startsWith("/checkout");

  return (
    <div className="min-h-screen bg-transparent">
      <CustomerToastRegion toast={toast} />

      <header className="sticky top-0 z-30 border-b border-white/70 bg-[#fffaf5]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">
              D&apos;Cart
            </p>
            <div className="flex items-center gap-3">
              <h1 className="truncate text-lg font-bold text-ink">Fast grocery delivery</h1>
              {activeOrder ? (
                <NavLink
                  to={`/orders/${activeOrder.id}`}
                  className="hidden rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 md:inline-flex"
                >
                  Track order #{activeOrder.id}
                </NavLink>
              ) : null}
            </div>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {mobileNavigation.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-ink text-white"
                      : "text-slate-600 hover:bg-white hover:text-ink"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="rounded-[22px] border border-white/80 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {user?.authProvider === "GOOGLE" ? "Google sign-in" : "Email sign-in"}
              </p>
            </div>
            <button type="button" onClick={logout} className="btn-secondary px-3 py-3">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        <Outlet />
      </main>

      {showStickyCart ? <StickyCartBar itemCount={cartCount} subtotal={cartSubtotal} /> : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/80 bg-[#fffaf5]/95 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 backdrop-blur xl:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {mobileNavigation.map((link) => {
            const Icon = link.icon;
            const isActive =
              location.pathname === link.to ||
              (link.to === "/orders" && location.pathname.startsWith("/orders/"));

            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`relative flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                  isActive ? "bg-ink text-white" : "text-slate-500"
                }`}
              >
                <Icon className="mb-1 h-5 w-5" />
                <span>{link.label}</span>
                {link.to === "/cart" && cartCount ? (
                  <span className="absolute right-3 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>
        <div className="mx-auto mt-2 flex max-w-xl justify-center lg:hidden">
          <button
            type="button"
            onClick={logout}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
          >
            Sign out
          </button>
        </div>
      </nav>
    </div>
  );
}

export function CustomerShell({ user, logout }) {
  return (
    <CustomerProvider>
      <CustomerLayout user={user} logout={logout} />
    </CustomerProvider>
  );
}

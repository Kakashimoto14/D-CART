import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, LogOut, Menu, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { BrandLogo } from "../brand/BrandLogo.jsx";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/apiError";
import { CustomerShell } from "./CustomerShell.jsx";
import { adminNavigation, customerNavigation, routeTitles, staffNavigation } from "./navigation.js";

function AdminSidebar({ links, onNavigate }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-6 py-6">
        <BrandLogo className="h-12 w-44 rounded-2xl bg-white px-3 py-2 shadow-sm" imageClassName="h-8" />
        <h1 className="mt-5 text-xl font-bold text-white">Grocery Ops</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Groceries. Delivered. Fast. Operations kept clean.
        </p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            location.pathname === link.to
            || (link.to !== "/admin" && location.pathname.startsWith(`${link.to}/`));

          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={`group flex items-center justify-between rounded-2xl px-4 py-3 transition ${
                isActive
                  ? "bg-white text-ink shadow-lg"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`rounded-xl p-2 ${
                    isActive ? "bg-brand-100 text-brand-600" : "bg-white/10 text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">{link.label}</span>
              </span>
              {link.comingSoon ? (
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Soon
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 px-5 pb-5">
        <div className="rounded-[18px] border border-white/10 bg-white/10 p-4 text-sm text-slate-100">
          <p className="font-semibold">Admin workspace</p>
          <p className="mt-2 leading-5 text-slate-300">
            Manage catalog, inventory, orders, customers, and reports.
          </p>
          <Link
            to="/admin/analytics"
            onClick={onNavigate}
            className="mt-3 inline-flex rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
          >
            View analytics
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminTopbar({ user, onOpenMenu, logout }) {
  const location = useLocation();
  const [quickOpen, setQuickOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const meta = routeTitles[location.pathname] || {
    eyebrow: "Workspace",
    title: "D'Cart",
    description: "Operational workspace"
  };
  const isAdmin = user?.role === "ADMIN";
  const showGlobalSearch = isAdmin && !location.pathname.startsWith("/admin/products");

  const quickActions = [
    { label: "Add product", to: "/admin/products" },
    { label: "Add category", to: "/admin/categories" },
    { label: "Receive inventory", to: "/admin/inventory" },
    { label: "View pending orders", to: "/admin/orders" },
    { label: "View low stock", to: "/admin/inventory" },
    { label: "Print sales report", to: "/admin/analytics" }
  ];

  useEffect(() => {
    if (!showGlobalSearch || searchTerm.trim().length < 2) {
      setSearchResults(null);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearchResults(await adminApi.search(searchTerm.trim()));
      } catch (_error) {
        setSearchResults(null);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchTerm, showGlobalSearch]);

  const handleOpenNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    setQuickOpen(false);
    setProfileOpen(false);

    if (!nextOpen || !isAdmin) return;

    try {
      setNotificationError("");
      const data = await adminApi.notifications();
      setNotifications(data.events || []);
    } catch (requestError) {
      setNotificationError(getApiErrorMessage(requestError, "Unable to load notifications."));
    }
  };

  const confirmLogout = () => {
    if (window.confirm("Sign out of the admin workspace?")) {
      logout();
    }
  };

  const flatSearchResults = searchResults
    ? Object.entries(searchResults).flatMap(([group, items]) =>
        items.map((item) => ({ ...item, group }))
      )
    : [];

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-[rgba(255,246,238,0.86)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="brand-kicker">{meta.eyebrow}</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{meta.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setQuickOpen((value) => !value);
                setNotificationsOpen(false);
                setProfileOpen(false);
              }}
              className="relative hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-600 md:inline-flex"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Quick action
            </button>
            {quickOpen ? (
              <div className="absolute right-24 top-20 z-30 w-64 rounded-[20px] border border-slate-100 bg-white p-2 shadow-xl">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    onClick={() => setQuickOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-600"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 ? (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-rose-500" />
              ) : null}
            </button>
            {notificationsOpen ? (
              <div className="absolute right-16 top-20 z-30 max-h-[70vh] w-[min(92vw,420px)] overflow-y-auto rounded-[20px] border border-slate-100 bg-white p-3 shadow-xl">
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="text-sm font-bold text-slate-900">Admin notifications</p>
                  <Link to="/admin/notifications" onClick={() => setNotificationsOpen(false)} className="text-xs font-semibold text-brand-600">
                    View all
                  </Link>
                </div>
                {notificationError ? <p className="px-2 py-3 text-sm text-rose-600">{notificationError}</p> : null}
                {notifications.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    to={item.metadata?.orderId ? "/admin/orders" : item.metadata?.productId ? "/admin/inventory" : "/admin/notifications"}
                    onClick={() => setNotificationsOpen(false)}
                    className="block rounded-2xl px-4 py-3 hover:bg-slate-50"
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                  </Link>
                ))}
                {!notificationError && notifications.length === 0 ? (
                  <p className="px-2 py-5 text-sm text-slate-500">No admin notifications right now.</p>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setProfileOpen((value) => !value);
                setQuickOpen(false);
                setNotificationsOpen(false);
              }}
              className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm sm:flex"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {user?.role === "ADMIN" ? "Store Admin" : user?.role}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {profileOpen ? (
              <div className="absolute right-16 top-20 z-30 w-72 rounded-[20px] border border-slate-100 bg-white p-3 shadow-xl">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{user?.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-brand-600">
                    {user?.role === "ADMIN" ? "Administrator" : user?.role}
                  </p>
                </div>
                <Link to="/admin/settings" onClick={() => setProfileOpen(false)} className="mt-2 block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-600">
                  Account settings
                </Link>
                <button type="button" onClick={confirmLogout} className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50">
                  Sign out
                </button>
              </div>
            ) : null}
            <button type="button" onClick={confirmLogout} className="btn-secondary px-3 py-3">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-3xl text-sm text-slate-500">{meta.description}</p>
          {showGlobalSearch ? (
            <label className="relative block w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="field pl-11"
                placeholder="Search workflows, products, orders, or records"
              />
              {flatSearchResults.length > 0 ? (
                <div className="absolute left-0 right-0 top-12 z-30 max-h-80 overflow-y-auto rounded-[20px] border border-slate-100 bg-white p-2 shadow-xl">
                  {flatSearchResults.map((item) => (
                    <Link
                      key={`${item.group}-${item.id}`}
                      to={item.to}
                      onClick={() => {
                        setSearchTerm("");
                        setSearchResults(null);
                      }}
                      className="block rounded-2xl px-4 py-3 hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{item.group} - {item.detail}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </label>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = useMemo(() => {
    if (user?.role === "ADMIN") return adminNavigation;
    if (user?.role === "STAFF") return staffNavigation;
    return customerNavigation;
  }, [user?.role]);

  if (user?.role === "CUSTOMER") {
    return <CustomerShell user={user} logout={logout} />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff6ee_0%,#fbf7f1_42%,#f7f2ec_100%)]">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 hidden h-screen w-[280px] shrink-0 overflow-hidden bg-[linear-gradient(180deg,#0d1b2a_0%,#111f30_58%,#2b3137_100%)] lg:block 2xl:w-[290px]">
          <AdminSidebar links={links} />
        </aside>

        <AnimatePresence>
          {mobileOpen ? (
            <>
              <motion.button
                type="button"
                aria-label="Close navigation"
                className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="fixed inset-y-0 left-0 z-50 h-screen w-[min(86vw,300px)] overflow-hidden bg-[linear-gradient(180deg,#0d1b2a_0%,#111f30_58%,#2b3137_100%)] lg:hidden"
              >
                <div className="flex justify-end p-4">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white"
                    aria-label="Close navigation"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <AdminSidebar links={links} onNavigate={() => setMobileOpen(false)} />
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <div className="min-w-0 flex-1 lg:pl-[280px] 2xl:pl-[290px]">
          <AdminTopbar user={user} logout={logout} onOpenMenu={() => setMobileOpen(true)} />
          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

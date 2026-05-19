import { ArrowRight, LogOut, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useCustomer } from "../hooks/useCustomer.js";

export function AccountPage() {
  const { logout, user } = useAuth();
  const { cartCount, activeOrder } = useCustomer();

  const quickLinks = [
    {
      to: activeOrder ? `/orders/${activeOrder.id}` : "/orders",
      label: activeOrder ? `Track order #${activeOrder.id}` : "My orders",
      description: "Follow progress, payment status, and delivery updates."
    },
    {
      to: "/cart",
      label: "Cart",
      description: `${cartCount} ${cartCount === 1 ? "item" : "items"} ready for checkout.`
    },
    {
      to: "/products",
      label: "Continue shopping",
      description: "Jump back into the full grocery catalog."
    }
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="panel overflow-hidden">
        <div className="bg-[linear-gradient(135deg,#0d1b2a_0%,#2b3137_100%)] px-6 py-7 text-white">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/10">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-14 w-14 rounded-[22px] object-cover" />
            ) : (
              <UserRound className="h-7 w-7" />
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold">{user?.name}</h2>
          <p className="mt-2 text-sm text-slate-300">{user?.email}</p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Sign-in method
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {user?.authProvider === "GOOGLE" ? "Google" : "Email and password"}
            </p>
          </div>

          <button type="button" onClick={logout} className="btn-secondary w-full justify-center">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="brand-kicker">
            Quick actions
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Keep the essentials close</h1>
        </div>

        {quickLinks.map((link, index) => (
          <Link
            key={link.to}
            to={link.to}
            className="panel flex items-center justify-between gap-4 px-5 py-5 transition hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[20px] bg-brand-50 text-brand-600">
                {index === 0 ? (
                  <ShoppingBag className="h-5 w-5" />
                ) : index === 1 ? (
                  <ShoppingCart className="h-5 w-5" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">{link.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{link.description}</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}

import { Boxes, FolderOpen, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { categoryApi } from "../api/categoryApi";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingState } from "../components/common/LoadingState.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { getApiErrorMessage } from "../utils/apiError.js";

function CategoryCard({ category }) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm">
      <div className="relative aspect-[16/8] bg-brand-50">
        {category.image ? (
          <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-500">
            <Boxes className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{category.name}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {category.description || "No description available for this category yet."}
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {category.productCount || 0} items
          </span>
        </div>
      </div>
    </article>
  );
}

export function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      setError("");
      setCategories(await categoryApi.list());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Categories could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive !== false),
    [categories]
  );

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin/categories" replace />;
  }

  if (loading) {
    return <LoadingState label="Loading categories..." />;
  }

  return (
    <section className="space-y-6">
      <div className="section-shell overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,240,234,0.98)_100%)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="brand-kicker">Categories</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Read-only category view</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Browse active catalog groups without admin editing controls. This page is safe for rider and staff accounts.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/products" className="btn-primary">
              Open catalog
            </Link>
            {user?.role === "STAFF" ? (
              <Link to="/picker" className="btn-secondary">
                Back to fulfillment
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[20px] bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Visible categories</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{activeCategories.length}</p>
          </div>
          <div className="rounded-[20px] bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Catalog context</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {activeCategories.reduce((sum, category) => sum + Number(category.productCount || 0), 0)}
            </p>
          </div>
          <div className="rounded-[20px] bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Access mode</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Read only
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {activeCategories.length === 0 ? (
        <EmptyState
          title="No active categories"
          description="There are no visible category groups right now."
          action={
            <Link to="/products" className="btn-secondary">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}

      {user?.role === "STAFF" ? (
        <div className="rounded-[22px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <FolderOpen className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Category management remains admin-only. Staff and rider accounts can use this view for order and delivery context without opening edit controls.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

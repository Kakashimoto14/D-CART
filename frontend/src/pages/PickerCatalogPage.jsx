import { Search } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { categoryApi } from "../api/categoryApi";
import { productApi } from "../api/productApi";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { ProductGridSkeleton } from "../components/customer/ProductGridSkeleton.jsx";
import { ProductCard } from "../components/products/ProductCard.jsx";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { getApiErrorMessage } from "../utils/apiError.js";

export function PickerCatalogPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const debouncedSearch = useDebouncedValue(searchTerm, 220);

  const loadProducts = useCallback(async () => {
    try {
      setError("");
      const [productResponse, categoryResponse] = await Promise.allSettled([
        productApi.list(),
        categoryApi.list()
      ]);

      startTransition(() => {
        setProducts(productResponse.status === "fulfilled" ? productResponse.value.products || [] : []);
        setCategories(categoryResponse.status === "fulfilled" ? categoryResponse.value || [] : []);
      });

      if (productResponse.status === "rejected") {
        setError(getApiErrorMessage(productResponse.reason, "Products could not be loaded. Please try again."));
      } else if (categoryResponse.status === "rejected") {
        setError(getApiErrorMessage(categoryResponse.reason, "Categories could not be loaded. Please try again."));
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Products could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const normalizedSearch = debouncedSearch.trim().toLowerCase();
  const filteredProducts = useMemo(
    () =>
      products
        .filter((product) => {
          const matchesSearch =
            !normalizedSearch ||
            product.name.toLowerCase().includes(normalizedSearch) ||
            product.category?.name?.toLowerCase().includes(normalizedSearch);
          const matchesCategory =
            selectedCategory === "All" || product.category?.name === selectedCategory;

          return matchesSearch && matchesCategory;
        })
        .sort((left, right) => Number(right.stock || 0) - Number(left.stock || 0)),
    [normalizedSearch, products, selectedCategory]
  );

  if (loading) {
    return <ProductGridSkeleton cards={9} />;
  }

  return (
    <section className="space-y-6">
      <div className="section-shell overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(235,244,239,0.96)_100%)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="brand-kicker">Operations Catalog</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Product reference for picking and delivery</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Search the live catalog, check stock visibility, and confirm category context without opening customer cart actions.
            </p>
          </div>
          <Link to="/picker" className="btn-secondary">
            Back to fulfillment
          </Link>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products, barcode, or category..."
              className="field pl-12"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`chip shrink-0 ${selectedCategory === "All" ? "chip-active" : ""}`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.name)}
                className={`chip shrink-0 gap-2 ${selectedCategory === category.name ? "chip-active" : ""}`}
              >
                {category.image ? (
                  <img src={category.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-brand-500" />
                )}
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {products.length === 0 ? (
        <EmptyState
          title="No products available"
          description="There are no catalog products available to review right now."
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No matching products"
          description="Try another search term or switch categories to browse more items."
          action={
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
              }}
              className="btn-secondary"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-900">{filteredProducts.length}</span> products
            </p>
            <p className="text-sm text-slate-500">Read-only catalog for fulfillment accounts</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} readonly />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

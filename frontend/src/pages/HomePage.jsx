import { Search, Sparkles, Truck } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { categoryApi } from "../api/categoryApi";
import { productApi } from "../api/productApi";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { ProductGridSkeleton } from "../components/customer/ProductGridSkeleton.jsx";
import { ProductCard } from "../components/products/ProductCard.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useCustomer } from "../hooks/useCustomer.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";

const isInStock = (product) => Number(product.stock || 0) > 0;

export function HomePage() {
  const { user } = useAuth();
  const { activeOrder, addToCart, cart, cartCount, removeCartItem, updateCartItem } = useCustomer();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [busyProductId, setBusyProductId] = useState(null);

  const debouncedSearch = useDebouncedValue(searchTerm, 220);

  const loadHomeData = useCallback(async () => {
    try {
      const [productResult, categoryResult] = await Promise.all([
        productApi.list(),
        categoryApi.list()
      ]);

      startTransition(() => {
        setProducts(productResult.products || []);
        setCategories(categoryResult || []);
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load the shop.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const cartQuantities = useMemo(
    () =>
      new Map(cart.items.map((item) => [item.productId, Number(item.quantity || 0)])),
    [cart.items]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category?.name?.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        selectedCategory === "All" || product.category?.name === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [debouncedSearch, products, selectedCategory]);

  const featuredProducts = useMemo(() => {
    const unpurchasedProducts = filteredProducts.filter(
      (product) => !cartQuantities.has(product.id) && isInStock(product)
    );
    const pool = unpurchasedProducts.length ? unpurchasedProducts : filteredProducts.filter(isInStock);

    return [...pool].sort((left, right) => Number(right.stock || 0) - Number(left.stock || 0)).slice(0, 6);
  }, [cartQuantities, filteredProducts]);

  const recentProducts = useMemo(
    () => filteredProducts.filter(isInStock).slice(0, 6),
    [filteredProducts]
  );

  const runProductAction = async (productId, action) => {
    setBusyProductId(productId);
    setError("");

    try {
      await action();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update your cart.");
    } finally {
      setBusyProductId(null);
    }
  };

  const renderProducts = (items) => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          quantity={cartQuantities.get(product.id) || 0}
          busy={busyProductId === product.id}
          onAddToCart={() => runProductAction(product.id, () => addToCart(product))}
          onIncrease={() => runProductAction(product.id, () => addToCart(product))}
          onDecrease={() =>
            runProductAction(product.id, () => {
              const currentQuantity = cartQuantities.get(product.id) || 0;
              return currentQuantity <= 1
                ? removeCartItem(product.id)
                : updateCartItem(product.id, currentQuantity - 1);
            })
          }
        />
      ))}
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="section-shell overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(255,240,234,0.94)_100%)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">
                Welcome back
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                {user?.name?.split(" ")[0] || "Shopper"}, what do you need today?
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                Search, add items, and check out without bouncing between pages. Your basket stays one tap away the whole time.
              </p>
            </div>

            <Link
              to="/cart"
              className="inline-flex items-center justify-between rounded-[22px] bg-ink px-5 py-4 text-white shadow-lg lg:min-w-[240px]"
            >
              <span>
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-300">
                  Cart summary
                </span>
                <span className="mt-1 block text-base font-semibold">
                  {cartCount} {cartCount === 1 ? "item" : "items"} ready
                </span>
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold">
                View cart
              </span>
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search milk, bread, vegetables, snacks..."
                className="field pl-12"
              />
            </label>
            <Link to="/products" className="btn-secondary">
              Browse full shop
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`chip ${selectedCategory === "All" ? "chip-active" : ""}`}
            >
              All items
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.name)}
                className={`chip ${selectedCategory === category.name ? "chip-active" : ""}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {activeOrder ? (
            <div className="panel bg-[linear-gradient(135deg,rgba(13,27,42,1)_0%,rgba(43,49,55,1)_100%)] px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Track your order
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">Order #{activeOrder.id}</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {activeOrder.status.replaceAll("_", " ")} • {activeOrder.paymentStatus}
                  </p>
                </div>
                <Truck className="h-10 w-10 text-brand-300" />
              </div>
              <Link to={`/orders/${activeOrder.id}`} className="btn-primary mt-5 w-full">
                Track order
              </Link>
            </div>
          ) : (
            <div className="panel px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Ready to shop
              </p>
              <h3 className="mt-2 text-xl font-bold text-ink">Fast checkout, less waiting</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add products from the catalog, review your basket, and place your order in a few guided steps.
              </p>
            </div>
          )}

          <div className="panel px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Today&apos;s shortcut</p>
                <p className="text-sm text-slate-500">Add from the product cards and keep moving.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {loading ? (
        <ProductGridSkeleton cards={6} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No products match your search"
          description="Try another keyword or switch to a different category to keep shopping."
          action={
            <button type="button" onClick={() => { setSearchTerm(""); setSelectedCategory("All"); }} className="btn-secondary">
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  {cartCount ? "Continue shopping" : "Popular items"}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-ink">
                  {cartCount ? "Keep building your basket" : "Start with customer favorites"}
                </h3>
              </div>
              <Link to="/products" className="hidden text-sm font-semibold text-brand-700 sm:inline-flex">
                See all
              </Link>
            </div>
            {renderProducts(featuredProducts)}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Recently added
              </p>
              <h3 className="mt-2 text-2xl font-bold text-ink">Fresh arrivals in the catalog</h3>
            </div>
            {renderProducts(recentProducts)}
          </div>
        </>
      )}
    </section>
  );
}

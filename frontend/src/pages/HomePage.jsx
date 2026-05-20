import { HelpCircle, Search, ShoppingBasket, Sparkles, Truck } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { categoryApi } from "../api/categoryApi";
import { productApi } from "../api/productApi";
import { BrandLogo } from "../components/brand/BrandLogo.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { ProductGridSkeleton } from "../components/customer/ProductGridSkeleton.jsx";
import { ProductCard } from "../components/products/ProductCard.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useCustomer } from "../hooks/useCustomer.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { getApiErrorMessage } from "../utils/apiError.js";

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

  const bestValueProducts = useMemo(
    () =>
      [...filteredProducts]
        .filter(isInStock)
        .sort((left, right) => Number(left.price || 0) - Number(right.price || 0))
        .slice(0, 8),
    [filteredProducts]
  );

  const productSections = useMemo(() => {
    const byCategory = (names, limit = 8) =>
      filteredProducts
        .filter((product) => names.includes(product.category?.name) && isInStock(product))
        .slice(0, limit);

    return [
      {
        kicker: "Best Sellers",
        title: "Popular Decolores picks",
        items: featuredProducts
      },
      {
        kicker: "Daily Essentials",
        title: "Fast-moving pantry basics",
        items: byCategory([
          "Canned Goods",
          "Noodles & Instant Food",
          "Condiments & Sauces",
          "Seasonings & Cooking Ingredients",
          "Beverages"
        ])
      },
      {
        kicker: "Snacks",
        title: "Chichirya and baon treats",
        items: byCategory(["Snacks / Chichirya", "Candies & Sweets"])
      },
      {
        kicker: "Rice & Grains",
        title: "Bigas by kilo and sack",
        items: byCategory(["Rice & Grains"], 6)
      },
      {
        kicker: "Cleaning Supplies",
        title: "Laundry and kitchen cleanup",
        items: byCategory(["Laundry & Cleaning", "Household Essentials"])
      },
      {
        kicker: "Personal Care",
        title: "Hygiene staples",
        items: byCategory(["Personal Care", "Baby & Kids"])
      },
      {
        kicker: "Wholesale Deals",
        title: "Sacks, cases, boxes, and value packs",
        items: filteredProducts
          .filter((product) => {
            const unit = String(product.unit || "").toLowerCase();
            return (
              isInStock(product) &&
              (["sack", "case", "box"].includes(unit) ||
                product.description?.toLowerCase().includes("wholesale-ready"))
            );
          })
          .slice(0, 8)
      }
    ].filter((section) => section.items.length > 0);
  }, [featuredProducts, filteredProducts]);

  const runProductAction = async (productId, action) => {
    setBusyProductId(productId);
    setError("");

    try {
      await action();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update your cart."));
    } finally {
      setBusyProductId(null);
    }
  };

  const renderProducts = (items, horizontal = false) => (
    <div
      className={
        horizontal
          ? "flex snap-x gap-3 overflow-x-auto pb-2"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
      }
    >
      {items.map((product) => (
        <div key={product.id} className={horizontal ? "w-40 shrink-0 snap-start sm:w-48" : ""}>
          <ProductCard
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
        </div>
      ))}
    </div>
  );

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="section-shell overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#0d1b2a_0%,#31403a_58%,#ff6b4a_160%)] text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <BrandLogo className="h-12 w-44 rounded-2xl bg-white px-3 py-2 shadow-sm" imageClassName="h-8" />
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Decolores grocery essentials, ready for delivery.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Hi {user?.name?.split(" ")[0] || "there"} - shop bigas, chichirya, canned goods, cleaning supplies, and sari-sari staples in a few taps.
              </p>
            </div>
            <Link to="/account" className="inline-flex items-center rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
              <HelpCircle className="mr-1 h-4 w-4" />
              Help
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search bigas, snacks, soap, noodles..."
                className="field border-white/20 bg-white pl-12"
              />
            </label>
            <Link to="/products" className="btn-primary rounded-xl">
              Browse full shop
            </Link>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`chip shrink-0 px-3 py-2 text-xs ${selectedCategory === "All" ? "chip-active" : "border-white/15 bg-white/10 text-white hover:bg-white/15"}`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.name)}
                className={`chip shrink-0 gap-2 px-3 py-2 text-xs ${selectedCategory === category.name ? "chip-active" : "border-white/15 bg-white/10 text-white hover:bg-white/15"}`}
              >
                {category.image ? (
                  <img src={category.image} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : null}
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
                    {activeOrder.status.replaceAll("_", " ")} - {activeOrder.paymentStatus}
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
              <p className="brand-kicker">
                Ready to shop
              </p>
              <h3 className="mt-2 text-xl font-bold text-ink">Palengke-style basics, online</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Build a basket from everyday household needs, review it quickly, and choose cash or GCash at checkout.
              </p>
            </div>
          )}

          <div className="panel px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <ShoppingBasket className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Compact shopping cards</p>
                <p className="text-sm text-slate-500">See price, unit, stock, and add items without leaving the aisle.</p>
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
          {bestValueProducts.length ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="brand-kicker">Budget Picks</p>
                  <h3 className="mt-1 text-xl font-bold text-ink">Low-price essentials</h3>
                </div>
                <Link to="/products" className="hidden text-sm font-semibold text-brand-600 sm:inline-flex">
                  See all
                </Link>
              </div>
              {renderProducts(bestValueProducts)}
            </div>
          ) : null}

          {productSections.map((section) => (
            <div key={section.kicker} className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="brand-kicker">{section.kicker}</p>
                  <h3 className="mt-1 text-xl font-bold text-ink">{section.title}</h3>
                </div>
                {section.kicker === "Best Sellers" ? <Sparkles className="h-5 w-5 text-brand-500" /> : null}
              </div>
              {renderProducts(section.items, section.items.length <= 6)}
            </div>
          ))}

          {recentProducts.length ? (
            <div className="space-y-4">
              <div>
                <p className="brand-kicker">Fresh Arrivals</p>
                <h3 className="mt-1 text-xl font-bold text-ink">Recently added to the catalog</h3>
              </div>
              {renderProducts(recentProducts)}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

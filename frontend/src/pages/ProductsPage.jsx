import { Search } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { categoryApi } from "../api/categoryApi";
import { productApi } from "../api/productApi";
import { EmptyState } from "../components/common/EmptyState";
import { ProductGridSkeleton } from "../components/customer/ProductGridSkeleton.jsx";
import { ProductCard } from "../components/products/ProductCard";
import { useCustomer } from "../hooks/useCustomer.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";

export function ProductsPage() {
  const { addToCart, cart, removeCartItem, updateCartItem } = useCustomer();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyProductId, setBusyProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const debouncedSearch = useDebouncedValue(searchTerm, 220);

  const loadProducts = useCallback(async () => {
    try {
      const [productResult, categoryResult] = await Promise.all([
        productApi.list(),
        categoryApi.list()
      ]);

      startTransition(() => {
        setProducts(productResult.products);
        setCategories(categoryResult);
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const cartQuantities = useMemo(
    () => new Map(cart.items.map((item) => [item.productId, Number(item.quantity || 0)])),
    [cart.items]
  );

  const runCartAction = async (productId, action) => {
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

  if (loading) {
    return <ProductGridSkeleton cards={9} />;
  }

  const normalizedSearch = debouncedSearch.trim().toLowerCase();
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category?.name?.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        selectedCategory === "All" || product.category?.name === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((left, right) => Number(right.stock || 0) - Number(left.stock || 0));

  return (
    <section className="space-y-6">
      <div className="section-shell overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(255,240,234,0.96)_100%)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Shop
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Fresh grocery essentials</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Find products fast, adjust quantities inline, and head to checkout when your basket is ready.
            </p>
          </div>
          <Link to="/cart" className="btn-secondary">
            Review cart
          </Link>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products, categories, or pantry staples"
              className="field pl-12"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`chip ${selectedCategory === "All" ? "chip-active" : ""}`}
            >
              All
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
      </div>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {products.length === 0 ? (
        <EmptyState
          title="No products available"
          description="Add inventory from the admin area to start receiving orders."
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No matching products"
          description="Try a different search term or switch categories to browse more items."
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
            <p className="text-sm text-slate-500">Tap any card to add or adjust quantities</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const quantity = cartQuantities.get(product.id) || 0;

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={quantity}
                  onAddToCart={() => runCartAction(product.id, () => addToCart(product))}
                  onIncrease={() => runCartAction(product.id, () => addToCart(product))}
                  onDecrease={() =>
                    runCartAction(product.id, () =>
                      quantity <= 1
                        ? removeCartItem(product.id)
                        : updateCartItem(product.id, quantity - 1)
                    )
                  }
                  busy={busyProductId === product.id}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

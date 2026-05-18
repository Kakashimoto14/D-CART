import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryApi } from "../api/categoryApi";
import { productApi } from "../api/productApi";
import {
  FilterToolbar,
  FormSection,
  PageHero,
  SectionCard
} from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { currency } from "../utils/format";

const initialForm = {
  id: null,
  name: "",
  price: "",
  stock: "",
  categoryId: ""
};

export function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [productForm, setProductForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [productResult, categoryResult] = await Promise.all([
        productApi.list(),
        categoryApi.list()
      ]);
      setProducts(productResult.products);
      setCategories(categoryResult);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      if (!normalizedQuery) return true;
      const haystack = [
        product.name,
        product.category?.name || "",
        product.barcode || ""
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [products, query]);

  const resetForm = () => setProductForm(initialForm);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: productForm.name,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      categoryId: Number(productForm.categoryId)
    };

    try {
      if (productForm.id) {
        await productApi.update(productForm.id, payload);
        setSuccess(`Updated ${productForm.name}.`);
      } else {
        await productApi.create(payload);
        setSuccess(`Added ${productForm.name}.`);
      }
      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) {
      return;
    }

    try {
      await productApi.remove(productId);
      setSuccess(`Removed product #${productId}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete product.");
    }
  };

  if (loading) {
    return <LoadingState label="Loading products..." />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Catalog"
        title="Product control"
        description="Keep storefront data clean, editable, and easy to scan for the admin team."
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Product list" description="Search, review, and edit core catalog records.">
          <div className="space-y-5">
            <FilterToolbar
              searchValue={query}
              onSearchChange={setQuery}
              searchPlaceholder="Search products, barcode, or category"
            />

            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-slate-900">{product.name}</p>
                        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                          {product.category?.name || "Uncategorized"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>Price: {currency(product.price)}</span>
                        <span>Stock: {product.stock}</span>
                        {product.barcode ? <span>Barcode: {product.barcode}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="btn-secondary px-4 py-2"
                        onClick={() =>
                          setProductForm({
                            id: product.id,
                            name: product.name,
                            price: String(product.price),
                            stock: String(product.stock),
                            categoryId: String(product.categoryId || "")
                          })
                        }
                      >
                        Edit
                      </button>
                      <button type="button" className="btn-danger px-4 py-2" onClick={() => handleDelete(product.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 ? (
                <p className="rounded-[20px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  No products match your search.
                </p>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title={productForm.id ? "Edit product" : "Add product"} description="Use a focused form instead of editing inside the table.">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormSection title="Core details">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="field sm:col-span-2"
                  placeholder="Product name"
                  value={productForm.name}
                  onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={productForm.price}
                  onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                  required
                />
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Initial stock"
                  value={productForm.stock}
                  onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))}
                  required
                />
                <select
                  className="field sm:col-span-2"
                  value={productForm.categoryId}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                  required
                >
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </FormSection>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-5 py-3">
                {saving ? "Saving..." : productForm.id ? "Save changes" : "Create product"}
              </button>
              {productForm.id ? (
                <button type="button" className="btn-secondary px-5 py-3" onClick={resetForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

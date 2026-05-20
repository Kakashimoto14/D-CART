import { AlertCircle, ImageIcon, LinkIcon, Pencil, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryApi } from "../api/categoryApi";
import { productApi } from "../api/productApi";
import { uploadApi } from "../api/uploadApi";
import {
  FilterToolbar,
  FormSection,
  PageHero,
  SectionCard
} from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { getApiErrorMessage } from "../utils/apiError";
import { currency } from "../utils/format";
import { getCategoryFallbackImage, getProductImageUrl, resolveImageUrl } from "../utils/productImages";

const initialForm = {
  id: null,
  name: "",
  description: "",
  image: "",
  price: "",
  stock: "",
  unit: "pc",
  barcode: "",
  categoryId: ""
};

function AdminProductImage({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getProductImageUrl(product, { forceFallback: imageFailed });

  useEffect(() => {
    setImageFailed(false);
  }, [product.category?.name, product.image]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={product.name}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="grocery-placeholder flex h-full items-center justify-center">
      <ImageIcon className="h-8 w-8 text-brand-400" />
    </div>
  );
}

const isValidImageValue = (value) => {
  if (!value) return true;
  return (
    /^https?:\/\//i.test(value) ||
    /^\/uploads\/products\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(value) ||
    /^\/images\/product-fallbacks\/[a-zA-Z0-9._-]+\.svg$/i.test(value)
  );
};

function ProductImageField({
  categories,
  form,
  imageMode,
  setImageMode,
  onImageChange,
  onRemoveImage
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [localPreview, setLocalPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const selectedCategory = categories.find((category) => String(category.id) === String(form.categoryId));
  const fallbackImage = getCategoryFallbackImage(selectedCategory?.name);
  const previewImage = imageFailed
    ? fallbackImage
    : localPreview || (form.image ? resolveImageUrl(form.image) : fallbackImage);
  const hasImageValue = Boolean(localPreview || form.image);
  const imageLooksValid = isValidImageValue(form.image);

  useEffect(() => {
    setImageFailed(false);
  }, [form.categoryId, form.image, localPreview]);

  useEffect(() => () => {
    if (localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
  }, [localPreview]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setUploadError("");

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be 5MB or smaller.");
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    if (localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(nextPreview);
    setUploading(true);

    try {
      const uploaded = await uploadApi.productImage(file);
      onImageChange(uploaded.url || "");
      setLocalPreview("");
    } catch (requestError) {
      setUploadError(getApiErrorMessage(requestError, "Image upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    if (localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview("");
    setUploadError("");
    onRemoveImage();
  };

  return (
    <FormSection title="Product image" description="Use a trusted image URL or upload a JPG, PNG, or WebP file up to 5MB.">
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
          <div className="aspect-[4/3] bg-white">
            <img
              src={previewImage}
              alt={form.name ? `${form.name} preview` : "Product image preview"}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          </div>
          <div className="border-t border-slate-100 px-3 py-2">
            <p className="truncate text-xs font-medium text-slate-500">
              {hasImageValue ? "Image preview" : "Category fallback preview"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setImageMode("url")}
              className={`inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                imageMode === "url" ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              Use image URL
            </button>
            <button
              type="button"
              onClick={() => setImageMode("upload")}
              className={`inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                imageMode === "upload" ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload image
            </button>
          </div>

          {imageMode === "url" ? (
            <div className="space-y-2">
              <input
                className="field"
                placeholder="https://example.com/product-image.webp"
                value={form.image}
                onChange={(event) => onImageChange(event.target.value)}
              />
              {!imageLooksValid ? (
                <p className="flex items-center gap-2 text-xs font-medium text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Enter a valid http(s) image URL or keep the existing local image path.
                </p>
              ) : imageFailed && form.image ? (
                <p className="flex items-center gap-2 text-xs font-medium text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  This image could not be previewed. A category fallback will show in the storefront.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-white px-4 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
                <Upload className="h-6 w-6 text-brand-500" />
                <span className="mt-2 text-sm font-semibold text-slate-900">
                  {uploading ? "Uploading image..." : "Choose product image"}
                </span>
                <span className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP up to 5MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
              {uploadError ? (
                <p className="flex items-center gap-2 text-xs font-medium text-rose-600">
                  <AlertCircle className="h-4 w-4" />
                  {uploadError}
                </p>
              ) : form.image?.startsWith("/uploads/") ? (
                <p className="text-xs font-medium text-emerald-700">Uploaded image is ready to save.</p>
              ) : null}
            </div>
          )}

          {hasImageValue ? (
            <button type="button" className="btn-secondary px-4 py-2 text-xs" onClick={handleRemove}>
              <X className="mr-2 h-4 w-4" />
              Remove image
            </button>
          ) : null}
        </div>
      </div>
    </FormSection>
  );
}

export function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [productForm, setProductForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [imageMode, setImageMode] = useState("url");

  const loadData = useCallback(async () => {
    try {
      setError("");
      setCategoryError("");
      const [productResponse, categoryResponse] = await Promise.allSettled([
        productApi.list(),
        categoryApi.list({ includeInactive: true })
      ]);

      if (productResponse.status === "fulfilled") {
        setProducts(productResponse.value?.products || []);
      } else {
        setProducts([]);
        setError(
          getApiErrorMessage(
            productResponse.reason,
            "Products could not be loaded. Please try again."
          )
        );
      }

      if (categoryResponse.status === "fulfilled") {
        setCategories(categoryResponse.value || []);
      } else {
        setCategories([]);
        setCategoryError(
          getApiErrorMessage(
            categoryResponse.reason,
            "Categories could not be loaded. Please try again."
          )
        );
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Products could not be loaded. Please try again."));
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
        product.barcode || "",
        product.description || ""
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [products, query]);

  const resetForm = () => {
    setProductForm(initialForm);
    setImageMode("url");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (!isValidImageValue(productForm.image)) {
      setSaving(false);
      setError("Enter a valid product image URL or upload a JPG, PNG, or WebP file.");
      return;
    }

    const payload = {
      name: productForm.name,
      description: productForm.description || undefined,
      image: productForm.image || null,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      unit: productForm.unit || "pc",
      barcode: productForm.barcode || null,
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
      setError(getApiErrorMessage(requestError, "Unable to save product."));
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
      setError(getApiErrorMessage(requestError, "Unable to delete product."));
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
      {categoryError ? <p className="text-sm font-medium text-amber-700">{categoryError}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Product list" description="Search, review, and edit core catalog records.">
          <div className="space-y-5">
            <FilterToolbar
              searchValue={query}
              onSearchChange={setQuery}
              searchPlaceholder="Search products, SKU, category, or description"
            >
              {query ? (
                <button type="button" className="btn-secondary px-4 py-2 text-xs" onClick={() => setQuery("")}>
                  Clear search
                </button>
              ) : null}
            </FilterToolbar>
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-900">{filteredProducts.length}</span> of{" "}
              <span className="font-semibold text-slate-900">{products.length}</span> products
              {query ? ` for "${query}"` : ""}.
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-[22px] border border-slate-100 bg-white transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
                    <div className="h-32 bg-brand-50 sm:h-full">
                      <AdminProductImage product={product} />
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-slate-900">{product.name}</p>
                        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
                          {product.category?.name || "Uncategorized"}
                        </span>
                      </div>
                      <p className="mt-2 min-h-10 overflow-hidden text-sm leading-5 text-slate-500">
                        {product.description || "No description yet."}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>Price: {currency(product.price)} / {product.unit || "pc"}</span>
                        <span>Stock: {product.stock}</span>
                        {product.barcode ? <span>Barcode: {product.barcode}</span> : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="btn-secondary px-4 py-2"
                          onClick={() => {
                            setProductForm({
                              id: product.id,
                              name: product.name,
                              description: product.description || "",
                              image: product.image || "",
                              price: String(product.price),
                              stock: String(product.stock),
                              unit: product.unit || "pc",
                              barcode: product.barcode || "",
                              categoryId: String(product.categoryId || "")
                            });
                            setImageMode(product.image?.startsWith("/uploads/") ? "upload" : "url");
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </button>
                        <button type="button" className="btn-danger px-4 py-2" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 ? (
                <p className="rounded-[20px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  No products found for this search.
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
                <textarea
                  className="field sm:col-span-2 min-h-24 resize-none"
                  placeholder="Description"
                  value={productForm.description}
                  onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
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
                <input
                  className="field"
                  placeholder="Unit, e.g. kg, pack, tray"
                  value={productForm.unit}
                  onChange={(event) => setProductForm((current) => ({ ...current, unit: event.target.value }))}
                />
                <input
                  className="field"
                  placeholder="Barcode (optional)"
                  value={productForm.barcode}
                  onChange={(event) => setProductForm((current) => ({ ...current, barcode: event.target.value }))}
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
            <ProductImageField
              categories={categories}
              form={productForm}
              imageMode={imageMode}
              setImageMode={setImageMode}
              onImageChange={(image) => setProductForm((current) => ({ ...current, image }))}
              onRemoveImage={() => setProductForm((current) => ({ ...current, image: "" }))}
            />
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

import { ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryApi } from "../api/categoryApi";
import { FilterToolbar, FormSection, SectionCard, StatCard } from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { getApiErrorMessage } from "../utils/apiError";

const initialForm = {
  id: null,
  name: "",
  description: "",
  image: "",
  isActive: true
};

const categoryInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState("grid");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");
      setCategories(await categoryApi.list({ includeInactive: true }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load categories."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch =
        !normalizedQuery ||
        [category.name, category.description || ""].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        status === "ALL" ||
        (status === "ACTIVE" && category.isActive) ||
        (status === "INACTIVE" && !category.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, query, status]);

  const resetForm = () => setForm(initialForm);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name,
      description: form.description || null,
      image: form.image || null,
      isActive: Boolean(form.isActive)
    };

    try {
      if (form.id) {
        await categoryApi.update(form.id, payload);
        setSuccess(`Updated ${form.name}.`);
      } else {
        await categoryApi.create(payload);
        setSuccess(`Created ${form.name}.`);
      }
      resetForm();
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save category."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const action = category.productCount > 0 ? "archive" : "delete";
    if (!window.confirm(`${action === "archive" ? "Archive" : "Delete"} ${category.name}?`)) {
      return;
    }

    try {
      const result = await categoryApi.remove(category.id);
      setSuccess(
        result.archived
          ? `${category.name} was archived because it has products.`
          : `${category.name} was deleted.`
      );
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update category."));
    }
  };

  if (loading) {
    return <LoadingState label="Loading categories..." />;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Categories" value={categories.length} icon={ImageIcon} />
        <StatCard label="Active" value={categories.filter((item) => item.isActive).length} />
        <StatCard label="Archived" value={categories.filter((item) => !item.isActive).length} />
        <StatCard
          label="Assigned products"
          value={categories.reduce((total, item) => total + Number(item.productCount || 0), 0)}
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Category workspace"
          description="Manage storefront groups, images, and active visibility."
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`btn-secondary px-4 py-2 ${view === "grid" ? "border-brand-300 text-brand-600" : ""}`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`btn-secondary px-4 py-2 ${view === "table" ? "border-brand-300 text-brand-600" : ""}`}
              >
                Table
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <FilterToolbar
              searchValue={query}
              onSearchChange={setQuery}
              searchPlaceholder="Search categories"
            >
              <select className="field min-w-[150px]" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="ALL">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Archived</option>
              </select>
            </FilterToolbar>

            {filteredCategories.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 px-5 py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-900">No categories found</p>
                <p className="mt-1 text-sm text-slate-500">Adjust search or create a new category.</p>
              </div>
            ) : view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCategories.map((category) => (
                  <article key={category.id} className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm">
                    <div className="relative aspect-[16/9] bg-brand-50">
                      {category.image ? (
                        <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grocery-placeholder flex h-full items-center justify-center">
                          <span className="rounded-full bg-white/80 px-4 py-3 text-3xl font-bold text-brand-600 shadow-sm">
                            {categoryInitials(category.name) || "DC"}
                          </span>
                        </div>
                      )}
                      <div className="absolute left-3 top-3">
                        <StatusBadge status={category.isActive ? "ACTIVE" : "ARCHIVED"} />
                      </div>
                    </div>
                    <div className="space-y-4 p-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{category.name}</h3>
                        <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">
                          {category.description || "No description yet."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Products</span>
                        <span className="font-semibold text-slate-900">{category.productCount}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary flex-1 px-3 py-2"
                          onClick={() => setForm({
                            id: category.id,
                            name: category.name,
                            description: category.description || "",
                            image: category.image || "",
                            isActive: category.isActive
                          })}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </button>
                        <button type="button" className="btn-danger px-3 py-2" onClick={() => handleDelete(category)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[20px] border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Products</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCategories.map((category) => (
                      <tr key={category.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{category.name}</p>
                          <p className="text-slate-500">{category.description || "No description"}</p>
                        </td>
                        <td className="px-4 py-3">{category.productCount}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={category.isActive ? "ACTIVE" : "ARCHIVED"} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="btn-secondary px-3 py-2" onClick={() => setForm({
                              id: category.id,
                              name: category.name,
                              description: category.description || "",
                              image: category.image || "",
                              isActive: category.isActive
                            })}>
                              Edit
                            </button>
                            <button type="button" className="btn-danger px-3 py-2" onClick={() => handleDelete(category)}>
                              {category.productCount > 0 ? "Archive" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={form.id ? "Edit category" : "Add category"}
          description="Use image URLs until a storage upload workflow is added."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormSection title="Category details">
              <input
                className="field"
                placeholder="Category name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <textarea
                className="field min-h-24 resize-none"
                placeholder="Description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
              <input
                className="field"
                type="url"
                placeholder="Image URL"
                value={form.image}
                onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
              />
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Active in storefront filters
              </label>
            </FormSection>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-5 py-3">
                <Plus className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : form.id ? "Save changes" : "Create category"}
              </button>
              {form.id ? (
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

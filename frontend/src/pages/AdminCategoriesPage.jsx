import { ImageIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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

function CategoryArtwork({ category }) {
  if (category.image) {
    return <img src={category.image} alt={category.name} className="h-full w-full object-cover" />;
  }

  return (
    <div className="grocery-placeholder flex h-full items-center justify-center">
      <span className="rounded-full bg-white/80 px-4 py-3 text-3xl font-bold text-brand-600 shadow-sm">
        {categoryInitials(category.name) || "DC"}
      </span>
    </div>
  );
}

function CategoryModal({
  form,
  categories,
  saving,
  onClose,
  onSubmit,
  onChange,
  onDelete
}) {
  const duplicateName = categories.some(
    (category) =>
      category.id !== form.id &&
      category.name.trim().toLowerCase() === form.name.trim().toLowerCase()
  );
  const canSubmit = form.name.trim().length >= 2 && !duplicateName && !saving;
  const previewCategory = {
    name: form.name || "Category preview",
    image: form.image
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="brand-kicker">Category details</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {form.id ? "Edit category" : "Add category"}
            </h2>
          </div>
          <button type="button" className="btn-secondary px-3 py-2" onClick={onClose} aria-label="Close category form">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
          <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-brand-50">
            <div className="aspect-[16/8]">
              <CategoryArtwork category={previewCategory} />
            </div>
          </div>

          <FormSection title="Storefront group">
            <div>
              <input
                className={`field ${duplicateName ? "border-rose-300" : ""}`}
                placeholder="Category name"
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                required
              />
              {duplicateName ? (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  A category with this name already exists.
                </p>
              ) : null}
            </div>
            <textarea
              className="field min-h-24 resize-none"
              placeholder="Description"
              value={form.description}
              onChange={(event) => onChange("description", event.target.value)}
            />
            <input
              className="field"
              type="url"
              placeholder="Image URL"
              value={form.image}
              onChange={(event) => onChange("image", event.target.value)}
            />
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => onChange("isActive", event.target.checked)}
              />
              Active in storefront filters
            </label>
          </FormSection>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {form.id ? (
                <button
                  type="button"
                  className="btn-danger px-5 py-3"
                  onClick={onDelete}
                  disabled={saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Archive/Delete
                </button>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary px-5 py-3" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" disabled={!canSubmit} className="btn-primary px-5 py-3">
                <Plus className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : form.id ? "Save changes" : "Create category"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState("grid");
  const [form, setForm] = useState(initialForm);
  const [modalOpen, setModalOpen] = useState(false);
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

  const openCreateModal = () => {
    setForm(initialForm);
    setModalOpen(true);
    setError("");
  };

  const openEditModal = (category) => {
    setForm({
      id: category.id,
      name: category.name,
      description: category.description || "",
      image: category.image || "",
      isActive: category.isActive
    });
    setModalOpen(true);
    setError("");
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setModalOpen(false);
    setForm(initialForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image: form.image.trim() || null,
      isActive: Boolean(form.isActive)
    };

    try {
      const saved = form.id
        ? await categoryApi.update(form.id, payload)
        : await categoryApi.create(payload);

      setCategories((current) => {
        if (form.id) {
          return current.map((category) =>
            category.id === saved.id ? { ...category, ...saved } : category
          );
        }
        return [...current, saved].sort((left, right) => left.name.localeCompare(right.name));
      });
      setSuccess(form.id ? `Updated ${saved.name}.` : `Created ${saved.name}.`);
      closeModal(true);
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

    setError("");
    setSuccess("");
    try {
      const result = await categoryApi.remove(category.id);
      if (result.archived) {
        setCategories((current) =>
          current.map((item) =>
            item.id === category.id ? { ...item, isActive: false } : item
          )
        );
      } else {
        setCategories((current) => current.filter((item) => item.id !== category.id));
      }
      setSuccess(
        result.archived
          ? `${category.name} was archived because it has products.`
          : `${category.name} was deleted.`
      );
      if (form.id === category.id) {
        closeModal(true);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update category."));
    }
  };

  if (loading) {
    return <LoadingState label="Loading categories..." />;
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Categories" value={categories.length} icon={ImageIcon} />
        <StatCard label="Active" value={categories.filter((item) => item.isActive).length} />
        <StatCard label="Archived" value={categories.filter((item) => !item.isActive).length} />
        <StatCard
          label="Assigned products"
          value={categories.reduce((total, item) => total + Number(item.productCount || 0), 0)}
        />
      </div>

      <SectionCard
        title="Category workspace"
        description="Manage storefront groups, images, and active visibility."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary px-4 py-2" onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </button>
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredCategories.map((category) => (
                <article key={category.id} className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm">
                  <div className="relative aspect-[16/9] bg-brand-50">
                    <CategoryArtwork category={category} />
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
                        onClick={() => openEditModal(category)}
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
                          <button type="button" className="btn-secondary px-3 py-2" onClick={() => openEditModal(category)}>
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

      {modalOpen ? (
        <CategoryModal
          form={form}
          categories={categories}
          saving={saving}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={updateForm}
          onDelete={() => {
            const category = categories.find((item) => item.id === form.id);
            if (category) {
              handleDelete(category);
            }
          }}
        />
      ) : null}
    </div>
  );
}

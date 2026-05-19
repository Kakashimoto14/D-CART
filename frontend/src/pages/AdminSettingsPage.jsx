import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/adminApi";
import { FormSection, PageHero, SectionCard } from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/apiError";

export function AdminSettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");
      setForm(await adminApi.settings());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await adminApi.updateSettings({
        storeName: form.storeName,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        deliveryRadius: Number(form.deliveryRadius),
        baseFee: Number(form.baseFee),
        perKmFee: Number(form.perKmFee)
      });
      setForm(updated);
      setSuccess("Settings saved.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save settings."));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <LoadingState label="Loading admin settings..." />;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Settings"
        title="Store settings"
        description="Persisted store profile and delivery pricing settings from the existing store configuration."
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="grid gap-6 2xl:grid-cols-[1fr_0.8fr]">
        <SectionCard title="Store profile" description="These values affect geofencing and checkout delivery fees.">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormSection title="Identity">
              <input
                className="field"
                value={form.storeName}
                onChange={(event) => updateField("storeName", event.target.value)}
                placeholder="Store name"
                required
              />
              <input className="field" value="PHP" disabled aria-label="Currency" />
            </FormSection>

            <FormSection title="Delivery area">
              <div className="grid gap-4 sm:grid-cols-3">
                <input className="field" type="number" step="0.000001" value={form.latitude} onChange={(event) => updateField("latitude", event.target.value)} required />
                <input className="field" type="number" step="0.000001" value={form.longitude} onChange={(event) => updateField("longitude", event.target.value)} required />
                <input className="field" type="number" min="0.1" step="0.1" value={form.deliveryRadius} onChange={(event) => updateField("deliveryRadius", event.target.value)} required />
              </div>
            </FormSection>

            <FormSection title="Delivery fees">
              <div className="grid gap-4 sm:grid-cols-2">
                <input className="field" type="number" min="0" step="0.01" value={form.baseFee} onChange={(event) => updateField("baseFee", event.target.value)} required />
                <input className="field" type="number" min="0" step="0.01" value={form.perKmFee} onChange={(event) => updateField("perKmFee", event.target.value)} required />
              </div>
            </FormSection>

            <button type="submit" className="btn-primary px-5 py-3" disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Admin account" description="Current signed-in administrator profile.">
          <div className="space-y-4">
            <div className="rounded-[20px] bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
              <p className="mt-3 inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
                {user?.role === "ADMIN" ? "Administrator" : user?.role}
              </p>
            </div>
            <p className="text-sm leading-6 text-slate-500">
              Password changes are handled through the existing forgot-password flow for this app.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

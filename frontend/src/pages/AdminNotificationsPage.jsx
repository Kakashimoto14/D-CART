import { useCallback, useEffect, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { adminApi } from "../api/adminApi";
import { PageHero, SectionCard, StatCard } from "../components/admin/AdminPrimitives.jsx";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/StatusBadge";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime } from "../utils/format";

export function AdminNotificationsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState({ events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retryingNotificationId, setRetryingNotificationId] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [data, notificationData] = await Promise.all([
        adminApi.dashboard(),
        adminApi.notifications()
      ]);
      setDashboard(data);
      setNotifications(notificationData);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load notification data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetryNotification = async (notificationLogId) => {
    setRetryingNotificationId(notificationLogId);
    setError("");
    setSuccess("");
    try {
      await adminApi.retryNotification(notificationLogId);
      setSuccess(`Notification #${notificationLogId} requeued for delivery.`);
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to retry notification."));
    } finally {
      setRetryingNotificationId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    setError("");
    setSuccess("");
    const previousNotifications = notifications;
    setNotifications((current) => ({ ...current, events: [], unreadCount: 0 }));

    try {
      const result = await adminApi.markAllNotificationsRead();
      setSuccess(`${result.readCount || 0} notification${result.readCount === 1 ? "" : "s"} marked as read.`);
      await loadData();
    } catch (requestError) {
      setNotifications(previousNotifications);
      setError(getApiErrorMessage(requestError, "Unable to mark notifications as read."));
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    setMarkingNotificationId(notificationId);
    setError("");
    setSuccess("");
    const previousNotifications = notifications;
    setNotifications((current) => ({
      ...current,
      events: (current.events || []).filter((event) => event.id !== notificationId),
      unreadCount: Math.max((current.unreadCount || 1) - 1, 0)
    }));

    try {
      await adminApi.markNotificationRead(notificationId);
      await loadData();
    } catch (requestError) {
      setNotifications(previousNotifications);
      setError(getApiErrorMessage(requestError, "Unable to mark notification as read."));
    } finally {
      setMarkingNotificationId(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading notifications and audit trail..." />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Notifications"
        title="Customer communications and audit visibility"
        description="Keep recoverability clear: what was sent, what failed, what was retried, and who performed operational recovery actions."
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sent in 24h" value={dashboard?.notifications?.last24Hours?.sent || 0} tone="success" />
        <StatCard label="Failed in 24h" value={dashboard?.notifications?.last24Hours?.failed || 0} tone={(dashboard?.notifications?.last24Hours?.failed || 0) > 0 ? "danger" : "default"} />
        <StatCard label="Skipped in 24h" value={dashboard?.notifications?.last24Hours?.skipped || 0} tone={(dashboard?.notifications?.last24Hours?.skipped || 0) > 0 ? "warning" : "default"} />
        <StatCard label="Audit events" value={dashboard?.audit?.recentLogs?.length || 0} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Admin alerts" description="Recent operational alerts from orders, payments, and inventory.">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{notifications.unreadCount || 0} unread alerts</p>
            <button
              type="button"
              className="btn-secondary inline-flex items-center justify-center gap-2 px-4 py-2"
              onClick={handleMarkAllRead}
              disabled={markingAllRead || (notifications.unreadCount || 0) === 0}
            >
              {markingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all as read
            </button>
          </div>
          <div className="space-y-3">
            {(notifications.events || []).slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{event.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{event.message}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={event.type} />
                    <button
                      type="button"
                      className="text-xs font-semibold text-brand-600 disabled:cursor-wait disabled:text-slate-300"
                      onClick={() => handleMarkNotificationRead(event.id)}
                      disabled={markingNotificationId === event.id}
                    >
                      {markingNotificationId === event.id ? "Marking..." : "Mark as read"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(notifications.events || []).length === 0 ? (
              <p className="text-sm text-slate-500">No new notifications.</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Recent notification delivery" description="Recent customer-facing email attempts with retry controls.">
          <div className="space-y-3">
            {(dashboard?.notifications?.recentLogs || []).map((log) => (
              <div key={log.id} className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-slate-900">{log.templateKey}</p>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                      <p>{log.recipient}</p>
                      <p>{log.subject || "No subject recorded"}</p>
                      <p>Order #{log.orderId || "N/A"} • {formatDateTime(log.createdAt)}</p>
                      {log.retryCount ? <p>Retry count: {log.retryCount}</p> : null}
                      {log.lastRetriedAt ? <p>Last retried: {formatDateTime(log.lastRetriedAt)}</p> : null}
                      {log.errorMessage ? <p className="text-rose-600">{log.errorMessage}</p> : null}
                    </div>
                  </div>
                  {["FAILED", "SKIPPED"].includes(log.status) ? (
                    <button
                      type="button"
                      className="btn-secondary px-4 py-2"
                      onClick={() => handleRetryNotification(log.id)}
                      disabled={retryingNotificationId === log.id}
                    >
                      {retryingNotificationId === log.id ? "Retrying..." : "Retry"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {(dashboard?.notifications?.recentLogs || []).length === 0 ? (
              <p className="text-sm text-slate-500">Notification delivery logs will appear here once customer updates are sent.</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Audit feed" description="Admin recovery and operational actions with actor attribution.">
          <div className="space-y-3">
            {(dashboard?.audit?.recentLogs || []).map((log) => (
              <div key={log.id} className="rounded-[22px] border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{log.action}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {log.actor?.name || "System"} • {log.entityType} #{log.entityId}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
                    {log.actor?.role || "SYSTEM"}
                  </span>
                </div>
              </div>
            ))}
            {(dashboard?.audit?.recentLogs || []).length === 0 ? (
              <p className="text-sm text-slate-500">Audit entries will appear here as staff complete recovery and admin actions.</p>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

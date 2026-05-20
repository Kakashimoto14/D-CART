import client from "./client";

export const adminApi = {
  dashboard: async () => {
    const { data } = await client.get("/admin/dashboard");
    return data.dashboard;
  },
  customers: async (params = {}) => {
    const { data } = await client.get("/admin/customers", { params });
    return data.customers;
  },
  suppliers: async (params = {}) => {
    const { data } = await client.get("/admin/suppliers", { params });
    return data.suppliers;
  },
  analytics: async (params = {}) => {
    const { data } = await client.get("/admin/analytics", { params });
    return data.analytics;
  },
  notifications: async () => {
    const { data } = await client.get("/admin/notifications");
    return data.notifications;
  },
  markNotificationRead: async (notificationId) => {
    const { data } = await client.patch(`/admin/notifications/${notificationId}/read`);
    return data;
  },
  markAllNotificationsRead: async () => {
    const { data } = await client.patch("/admin/notifications/read-all");
    return data;
  },
  settings: async () => {
    const { data } = await client.get("/admin/settings");
    return data.settings;
  },
  updateSettings: async (payload) => {
    const { data } = await client.put("/admin/settings", payload);
    return data.settings;
  },
  search: async (q) => {
    const { data } = await client.get("/admin/search", { params: { q } });
    return data.results;
  },
  completeRefund: async (orderId) => {
    const { data } = await client.patch(`/admin/refunds/${orderId}/complete`);
    return data.order;
  },
  retryNotification: async (notificationLogId) => {
    const { data } = await client.patch(`/admin/notifications/${notificationLogId}/retry`);
    return data.notification;
  },
  createStaff: async (payload) => {
    const { data } = await client.post("/admin/staff", payload);
    return data.staff;
  }
};

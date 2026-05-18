import client from "./client";

export const adminApi = {
  dashboard: async () => {
    const { data } = await client.get("/admin/dashboard");
    return data.dashboard;
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

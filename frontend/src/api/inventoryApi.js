import client from "./client";

export const inventoryApi = {
  list: async (params = {}) => {
    const { data } = await client.get("/inventory", { params });
    return data;
  },
  alerts: async (params = {}) => {
    const { data } = await client.get("/inventory/alerts", { params });
    return data.alerts;
  },
  cleanupExpiredReservations: async () => {
    const { data } = await client.post("/inventory/reservations/cleanup");
    return data.cleanup;
  },
  receiveStock: async (productId, payload) => {
    const { data } = await client.post(`/inventory/${productId}/receive`, payload);
    return data.inventory;
  }
};

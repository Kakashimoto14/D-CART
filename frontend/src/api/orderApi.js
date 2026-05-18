import client from "./client";

export const orderApi = {
  checkout: async (payload) => {
    const { data } = await client.post("/orders/checkout", payload);
    return data.order;
  },
  list: async (params = {}) => {
    const { data } = await client.get("/orders", { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await client.get(`/orders/${id}`);
    return data.order;
  },
  cancel: async (id) => {
    const { data } = await client.patch(`/orders/${id}/cancel`);
    return data.order;
  },
  reviewSubstitution: async (orderId, itemId, decision) => {
    const { data } = await client.patch(
      `/orders/${orderId}/items/${itemId}/substitution-review`,
      { decision }
    );
    return data.order;
  },
  downloadReceipt: async (id) => {
    const response = await client.get(`/orders/${id}/receipt`, {
      responseType: "blob"
    });

    return response.data;
  },
  updateStatus: async (id, payload) => {
    const { data } = await client.patch(`/orders/${id}/status`, payload);
    return data.order;
  }
};

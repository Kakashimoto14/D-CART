import client from "./client";

export const cartApi = {
  get: async () => {
    const { data } = await client.get("/cart");
    return data.cart;
  },
  addItem: async (payload) => {
    const { data } = await client.post("/cart/items", payload);
    return data.cart;
  },
  updateItem: async (productId, payload) => {
    const { data } = await client.patch(`/cart/items/${productId}`, payload);
    return data.cart;
  },
  removeItem: async (productId) => {
    const { data } = await client.delete(`/cart/items/${productId}`);
    return data.cart;
  },
  clear: async () => {
    const { data } = await client.delete("/cart");
    return data.cart;
  }
};

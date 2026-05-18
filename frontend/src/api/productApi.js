import client from "./client";

export const productApi = {
  list: async (params = {}) => {
    const { data } = await client.get("/products", { params });
    return data;
  },
  create: async (payload) => {
    const { data } = await client.post("/products", payload);
    return data.product;
  },
  update: async (id, payload) => {
    const { data } = await client.put(`/products/${id}`, payload);
    return data.product;
  },
  remove: async (id) => {
    await client.delete(`/products/${id}`);
  }
};

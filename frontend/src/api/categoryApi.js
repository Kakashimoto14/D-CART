import client from "./client";

const normalizeCategories = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.data?.categories)) return data.data.categories;
  return [];
};

export const categoryApi = {
  list: async (params = {}) => {
    const { data } = await client.get("/categories", { params });
    return normalizeCategories(data);
  },
  create: async (payload) => {
    const { data } = await client.post("/categories", payload);
    return data.category;
  },
  update: async (id, payload) => {
    const { data } = await client.put(`/categories/${id}`, payload);
    return data.category;
  },
  remove: async (id) => {
    const { data } = await client.delete(`/categories/${id}`);
    return data;
  }
};

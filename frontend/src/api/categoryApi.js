import client from "./client";

export const categoryApi = {
  list: async () => {
    const { data } = await client.get("/categories");
    return data.categories;
  }
};

import client from "./client";

export const uploadApi = {
  productImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const { data } = await client.post("/uploads/product-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return data;
  }
};

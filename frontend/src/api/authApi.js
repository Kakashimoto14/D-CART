import client from "./client";

export const authApi = {
  login: async (payload) => {
    const { data } = await client.post("/auth/login", payload);
    return data;
  },
  googleLogin: async (payload) => {
    const { data } = await client.post("/auth/google", payload);
    return data;
  },
  register: async (payload) => {
    const { data } = await client.post("/auth/register", payload);
    return data;
  },
  refresh: async () => {
    const { data } = await client.post("/auth/refresh");
    return data;
  },
  session: async () => {
    const { data } = await client.get("/auth/session");
    return data;
  },
  logout: async () => {
    const { data } = await client.post("/auth/logout");
    return data;
  },
  forgotPassword: async (payload) => {
    const { data } = await client.post("/auth/forgot-password", payload);
    return data;
  },
  resetPassword: async (payload) => {
    const { data } = await client.post("/auth/reset-password", payload);
    return data;
  },
  getMe: async () => {
    const { data } = await client.get("/auth/me");
    return data;
  }
};

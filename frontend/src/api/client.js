import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = client
      .post("/auth/refresh")
      .then(({ data }) => {
        localStorage.setItem("dcart_token", data.token);
        return data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("dcart_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Auto-handle expired or invalid tokens
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;
    const isRefreshRoute = originalRequest.url?.includes("/auth/refresh");

    if (isUnauthorized && !originalRequest._retry && !isRefreshRoute) {
      originalRequest._retry = true;

      try {
        const token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return client(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("dcart_token");
        window.dispatchEvent(new CustomEvent("dcart:unauthorized"));
        return Promise.reject(refreshError);
      }
    }

    if (isUnauthorized && isRefreshRoute) {
      localStorage.removeItem("dcart_token");
      window.dispatchEvent(new CustomEvent("dcart:unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default client;

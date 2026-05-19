export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  fallback;

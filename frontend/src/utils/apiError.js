const TECHNICAL_ERROR_PATTERNS =
  /prisma|transaction|database|sql|stack|timeout was|model|constraint|paymongo|fetch failed/i;

export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.code === "ECONNABORTED") {
    return "Something went wrong. Please try again or contact support.";
  }

  const message = error?.response?.data?.error?.message || error?.response?.data?.message;

  if (!message || TECHNICAL_ERROR_PATTERNS.test(message)) {
    return fallback;
  }

  return message;
};

export const getCheckoutErrorMessage = (error) =>
  getApiErrorMessage(error, "Checkout could not be completed. Please try again.");

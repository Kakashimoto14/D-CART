import { logger } from "../infrastructure/logger/logger.js";

export const notFoundHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Resource not found."
    }
  });
};

const ERROR_MESSAGES = {
  CHECKOUT_FAILED: "Checkout could not be completed. Please try again.",
  CHECKOUT_TIMEOUT:
    "Checkout is taking longer than expected. Please try again. If you were charged, contact support with your order reference.",
  PAYMENT_FAILED:
    "Payment could not be completed. Please check your GCash details or try another payment method.",
  OUT_OF_STOCK: "Some items in your cart are no longer available. Please review your cart and try again.",
  VALIDATION_ERROR: "Please check the required fields and try again.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You do not have access to this resource.",
  NOT_FOUND: "Resource not found.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  UNKNOWN: "Something went wrong. Please try again or contact support if the problem continues."
};

const detectInternalCode = (error, statusCode, req) => {
  const message = String(error.message || "");
  const requestPath = req?.originalUrl || "";
  const isCheckoutPath =
    requestPath.includes("/orders/checkout") ||
    requestPath.includes("/payment") ||
    requestPath.includes("/paymongo");

  if (error.isOperational && error.code) return error.code;
  if (statusCode === 422 || error.name === "ZodError") return "VALIDATION_ERROR";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 429) return "RATE_LIMITED";
  if (/insufficient.*stock|stock.*unavailable|out of stock/i.test(message)) return "OUT_OF_STOCK";
  if (
    isCheckoutPath &&
    /transaction already closed|expired transaction|timeout.*transaction/i.test(message)
  ) {
    return "CHECKOUT_TIMEOUT";
  }
  if (requestPath.includes("/orders/checkout")) return "CHECKOUT_FAILED";

  return statusCode >= 500 ? "UNKNOWN" : "VALIDATION_ERROR";
};

const getSafeMessage = (error, code, statusCode) => {
  if (code === "VALIDATION_ERROR") return ERROR_MESSAGES.VALIDATION_ERROR;
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];

  if (error.isOperational && statusCode < 500) {
    return error.message;
  }

  return ERROR_MESSAGES.UNKNOWN;
};

export const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const code = detectInternalCode(error, statusCode, req);
  const message = getSafeMessage(error, code, statusCode);

  logger[statusCode >= 500 ? "error" : "warn"](
    {
      err: error,
      requestId: req.id,
      statusCode,
      safeCode: code
    },
    error.message || "Request failed."
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    },
    message
  });
};

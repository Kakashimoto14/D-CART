import { logger } from "../infrastructure/logger/logger.js";

export const notFoundHandler = (_req, res) => {
  res.status(404).json({
    message: "Resource not found."
  });
};

export const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  logger[statusCode >= 500 ? "error" : "warn"](
    {
      err: error,
      requestId: req.id,
      statusCode
    },
    error.message || "Request failed."
  );

  res.status(statusCode).json({
    message: error.message || "Internal server error.",
    details: isProduction ? null : (error.details || null)
  });
};

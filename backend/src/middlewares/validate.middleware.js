import { AppError } from "../utils/AppError.js";

export const validateBody = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return next(new AppError("Validation failed.", 422, parsed.error.flatten()));
  }

  req.body = parsed.data;
  next();
};

export const validateParams = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.params);

  if (!parsed.success) {
    return next(new AppError("Validation failed.", 422, parsed.error.flatten()));
  }

  req.params = parsed.data;
  next();
};

export const validateQuery = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.query);

  if (!parsed.success) {
    return next(new AppError("Validation failed.", 422, parsed.error.flatten()));
  }

  req.query = parsed.data;
  next();
};

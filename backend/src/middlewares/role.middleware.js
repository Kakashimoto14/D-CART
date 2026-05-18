import { AppError } from "../utils/AppError.js";

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError("You do not have access to this resource.", 403));
  }

  next();
};

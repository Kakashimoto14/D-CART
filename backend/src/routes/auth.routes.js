import { Router } from "express";
import {
  forgotPassword,
  getMe,
  getSession,
  googleLogin,
  login,
  logout,
  refreshSession,
  register,
  resetPassword
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import rateLimit from "express-rate-limit";
import {
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from "../validators/auth.validator.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." }
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset requests. Please try again later." }
});

const googleAuthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many Google sign-in attempts. Please try again later." }
});

router.post("/register", authLimiter, validateBody(registerSchema), asyncHandler(register));
router.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(login));
router.post(
  "/google",
  googleAuthLimiter,
  validateBody(googleLoginSchema),
  asyncHandler(googleLogin)
);
router.post("/refresh", asyncHandler(refreshSession));
router.get("/session", asyncHandler(getSession));
router.post("/logout", asyncHandler(logout));
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(forgotPassword)
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(resetPassword)
);
router.get("/me", authenticate, asyncHandler(getMe));

export default router;

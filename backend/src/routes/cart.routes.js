import { Router } from "express";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem
} from "../controllers/cart.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addCartItemSchema,
  productIdOnlyParamSchema,
  updateCartItemSchema
} from "../validators/cart.validator.js";

const router = Router();

router.use(authenticate);
router.get("/", asyncHandler(getCart));
router.post("/items", validateBody(addCartItemSchema), asyncHandler(addCartItem));
router.patch(
  "/items/:productId",
  validateParams(productIdOnlyParamSchema),
  validateBody(updateCartItemSchema),
  asyncHandler(updateCartItem)
);
router.delete(
  "/items/:productId",
  validateParams(productIdOnlyParamSchema),
  asyncHandler(removeCartItem)
);
router.delete("/", asyncHandler(clearCart));

export default router;

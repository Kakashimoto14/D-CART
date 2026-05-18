import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct
} from "../controllers/product.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createProductSchema,
  productIdParamSchema,
  updateProductSchema
} from "../validators/product.validator.js";

const router = Router();

router.get("/", asyncHandler(listProducts));
router.get("/:id", validateParams(productIdParamSchema), asyncHandler(getProduct));
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validateBody(createProductSchema),
  asyncHandler(createProduct)
);
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validateParams(productIdParamSchema),
  validateBody(updateProductSchema),
  asyncHandler(updateProduct)
);
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validateParams(productIdParamSchema),
  asyncHandler(deleteProduct)
);

export default router;

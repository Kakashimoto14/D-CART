import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from "../controllers/category.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  categoryIdParamSchema,
  categoryListQuerySchema,
  createCategorySchema,
  updateCategorySchema
} from "../validators/category.validator.js";

const router = Router();

router.get("/", validateQuery(categoryListQuerySchema), asyncHandler(listCategories));
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validateBody(createCategorySchema),
  asyncHandler(createCategory)
);
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  asyncHandler(updateCategory)
);
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validateParams(categoryIdParamSchema),
  asyncHandler(deleteCategory)
);

export default router;

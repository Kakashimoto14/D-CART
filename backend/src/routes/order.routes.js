import { Router } from "express";
import {
  checkout,
  downloadReceipt,
  getOrder,
  listOrders,
  reviewSubstitution,
  updateOrderStatus,
  cancelOrder
} from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  checkoutSchema,
  orderItemParamSchema,
  orderIdParamSchema,
  substitutionReviewSchema,
  updateOrderStatusSchema
} from "../validators/order.validator.js";

const router = Router();

router.use(authenticate);
router.get("/", asyncHandler(listOrders));
router.get("/:id", validateParams(orderIdParamSchema), asyncHandler(getOrder));
router.post("/checkout", validateBody(checkoutSchema), asyncHandler(checkout));
router.patch(
  "/:id/cancel",
  validateParams(orderIdParamSchema),
  asyncHandler(cancelOrder)
);
router.patch(
  "/:id/items/:itemId/substitution-review",
  validateParams(orderItemParamSchema),
  validateBody(substitutionReviewSchema),
  asyncHandler(reviewSubstitution)
);
router.patch(
  "/:id/status",
  authorize("ADMIN"),
  validateParams(orderIdParamSchema),
  validateBody(updateOrderStatusSchema),
  asyncHandler(updateOrderStatus)
);
router.get("/:id/receipt", validateParams(orderIdParamSchema), asyncHandler(downloadReceipt));

export default router;

import { Router } from "express";
import {
  completeRefund,
  createStaff,
  getDashboard,
  retryNotification
} from "../controllers/admin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  adminNotificationLogParamSchema,
  adminOrderParamSchema,
  createStaffSchema
} from "../validators/admin.validator.js";

const router = Router();

router.get("/dashboard", authenticate, authorize("ADMIN"), asyncHandler(getDashboard));
router.patch(
  "/refunds/:orderId/complete",
  authenticate,
  authorize("ADMIN"),
  validateParams(adminOrderParamSchema),
  asyncHandler(completeRefund)
);
router.patch(
  "/notifications/:notificationLogId/retry",
  authenticate,
  authorize("ADMIN"),
  validateParams(adminNotificationLogParamSchema),
  asyncHandler(retryNotification)
);
router.post(
  "/staff",
  authenticate,
  authorize("ADMIN"),
  validateBody(createStaffSchema),
  asyncHandler(createStaff)
);

export default router;

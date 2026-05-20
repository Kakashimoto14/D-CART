import { Router } from "express";
import {
  completeRefund,
  createStaff,
  getDashboard,
  getNotifications,
  getSalesAnalytics,
  getSettings,
  globalSearch,
  listCustomers,
  listSuppliers,
  markAllNotificationsRead,
  markNotificationRead,
  updateSettings,
  retryNotification
} from "../controllers/admin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  adminNotificationLogParamSchema,
  adminNotificationParamSchema,
  adminOrderParamSchema,
  adminListQuerySchema,
  adminSearchQuerySchema,
  createStaffSchema,
  updateStoreSettingsSchema
} from "../validators/admin.validator.js";

const router = Router();

router.get("/dashboard", authenticate, authorize("ADMIN"), asyncHandler(getDashboard));
router.get(
  "/customers",
  authenticate,
  authorize("ADMIN"),
  validateQuery(adminListQuerySchema),
  asyncHandler(listCustomers)
);
router.get(
  "/suppliers",
  authenticate,
  authorize("ADMIN"),
  validateQuery(adminListQuerySchema),
  asyncHandler(listSuppliers)
);
router.get(
  "/analytics",
  authenticate,
  authorize("ADMIN"),
  validateQuery(adminListQuerySchema),
  asyncHandler(getSalesAnalytics)
);
router.get("/notifications", authenticate, authorize("ADMIN"), asyncHandler(getNotifications));
router.patch(
  "/notifications/read-all",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(markAllNotificationsRead)
);
router.patch(
  "/notifications/:notificationId/read",
  authenticate,
  authorize("ADMIN"),
  validateParams(adminNotificationParamSchema),
  asyncHandler(markNotificationRead)
);
router.get("/settings", authenticate, authorize("ADMIN"), asyncHandler(getSettings));
router.put(
  "/settings",
  authenticate,
  authorize("ADMIN"),
  validateBody(updateStoreSettingsSchema),
  asyncHandler(updateSettings)
);
router.get(
  "/search",
  authenticate,
  authorize("ADMIN"),
  validateQuery(adminSearchQuerySchema),
  asyncHandler(globalSearch)
);
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

import { Router } from "express";
import {
  cleanupExpiredReservations,
  getInventoryAlerts,
  getInventoryItem,
  listInventory,
  receiveStock
} from "../controllers/inventory.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery
} from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  inventoryListQuerySchema,
  inventoryProductIdParamSchema,
  receiveStockSchema
} from "../validators/inventory.validator.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));
router.get("/", validateQuery(inventoryListQuerySchema), asyncHandler(listInventory));
router.get("/alerts", validateQuery(inventoryListQuerySchema), asyncHandler(getInventoryAlerts));
router.post("/reservations/cleanup", asyncHandler(cleanupExpiredReservations));
router.get(
  "/:productId",
  validateParams(inventoryProductIdParamSchema),
  asyncHandler(getInventoryItem)
);
router.post(
  "/:productId/receive",
  validateParams(inventoryProductIdParamSchema),
  validateBody(receiveStockSchema),
  asyncHandler(receiveStock)
);

export default router;

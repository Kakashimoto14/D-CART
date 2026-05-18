import { Router } from "express";
import {
  markOrderPacked,
  markOrderReadyForDispatch
} from "../controllers/fulfillment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  fulfillmentOrderParamSchema,
  packOrderSchema
} from "../validators/fulfillment.validator.js";

const router = Router();

router.use(authenticate, authorize("ADMIN", "STAFF"));
router.patch(
  "/orders/:orderId/packed",
  validateParams(fulfillmentOrderParamSchema),
  validateBody(packOrderSchema),
  asyncHandler(markOrderPacked)
);
router.patch(
  "/orders/:orderId/ready",
  validateParams(fulfillmentOrderParamSchema),
  asyncHandler(markOrderReadyForDispatch)
);

export default router;

import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { ROLES } from "../constants/roles.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getPickerOrders,
  claimOrder,
  markItemUnavailable,
  pickItem,
  substituteItem,
  updatePickerNotes
} from "../controllers/picker.controller.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import {
  pickItemSchema,
  pickerItemParamSchema,
  pickerNotesSchema,
  pickerOrderParamSchema,
  substituteItemSchema,
  unavailableItemSchema
} from "../validators/picker.validator.js";

const router = Router();

// All picker routes require authentication + STAFF or ADMIN role
router.use(authenticate, authorize(ROLES.STAFF, ROLES.ADMIN));

router.get("/orders", asyncHandler(getPickerOrders));
router.patch(
  "/orders/:orderId/claim",
  validateParams(pickerOrderParamSchema),
  asyncHandler(claimOrder)
);
router.patch(
  "/orders/:orderId/items/:itemId/pick",
  validateParams(pickerItemParamSchema),
  validateBody(pickItemSchema),
  asyncHandler(pickItem)
);
router.patch(
  "/orders/:orderId/items/:itemId/unavailable",
  validateParams(pickerItemParamSchema),
  validateBody(unavailableItemSchema),
  asyncHandler(markItemUnavailable)
);
router.patch(
  "/orders/:orderId/items/:itemId/substitute",
  validateParams(pickerItemParamSchema),
  validateBody(substituteItemSchema),
  asyncHandler(substituteItem)
);
router.patch(
  "/orders/:orderId/notes",
  validateParams(pickerOrderParamSchema),
  validateBody(pickerNotesSchema),
  asyncHandler(updatePickerNotes)
);

export default router;

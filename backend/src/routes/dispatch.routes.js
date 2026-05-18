import { Router } from "express";
import {
  assignRider,
  completeDispatch,
  createRider,
  failDispatch,
  getDispatchBoard,
  getMyActiveDispatch,
  startDispatch,
  updateMyRiderLocation,
  updateRiderAvailability
} from "../controllers/dispatch.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../constants/roles.js";
import {
  assignRiderSchema,
  createRiderSchema,
  dispatchOrderParamSchema,
  riderIdParamSchema,
  updateRiderLocationSchema,
  updateRiderAvailabilitySchema
} from "../validators/dispatch.validator.js";
import {
  completeDispatchSchema,
  failDispatchSchema
} from "../validators/delivery.validator.js";

const router = Router();

router.use(authenticate);
router.get(
  "/rider/me",
  authorize(ROLES.STAFF, ROLES.ADMIN),
  asyncHandler(getMyActiveDispatch)
);
router.patch(
  "/rider/me/location",
  authorize(ROLES.STAFF, ROLES.ADMIN),
  validateBody(updateRiderLocationSchema),
  asyncHandler(updateMyRiderLocation)
);

router.use(authorize("ADMIN"));
router.get("/board", asyncHandler(getDispatchBoard));
router.post("/riders", validateBody(createRiderSchema), asyncHandler(createRider));
router.patch(
  "/riders/:riderId/availability",
  validateParams(riderIdParamSchema),
  validateBody(updateRiderAvailabilitySchema),
  asyncHandler(updateRiderAvailability)
);
router.patch(
  "/orders/:orderId/assign",
  validateParams(dispatchOrderParamSchema),
  validateBody(assignRiderSchema),
  asyncHandler(assignRider)
);
router.patch(
  "/orders/:orderId/start",
  validateParams(dispatchOrderParamSchema),
  asyncHandler(startDispatch)
);
router.patch(
  "/orders/:orderId/complete",
  validateParams(dispatchOrderParamSchema),
  validateBody(completeDispatchSchema),
  asyncHandler(completeDispatch)
);
router.patch(
  "/orders/:orderId/fail",
  validateParams(dispatchOrderParamSchema),
  validateBody(failDispatchSchema),
  asyncHandler(failDispatch)
);

export default router;

import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { ROLES } from "../constants/roles.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getAllSlots,
  getAvailableSlots,
  generateSlots
} from "../controllers/deliverySlot.controller.js";

const router = Router();

// Authenticated customers can view available slots
router.get("/", authenticate, asyncHandler(getAvailableSlots));

// Only admins can generate/manage slots
router.get("/all", authenticate, authorize(ROLES.ADMIN), asyncHandler(getAllSlots));
router.post("/generate", authenticate, authorize(ROLES.ADMIN), asyncHandler(generateSlots));

export default router;

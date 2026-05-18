import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateLocation, getStoreZone } from "../controllers/geofencing.controller.js";

const router = Router();

// Public endpoints — no authentication needed (used before checkout)
router.post("/validate", asyncHandler(validateLocation));
router.get("/store-zone", asyncHandler(getStoreZone));

export default router;

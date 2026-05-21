import { z } from "zod";

export const checkoutSchema = z.object({
  address: z.string().min(10).max(255),
  deliveryType: z.enum(["STANDARD", "SAME_DAY"]).default("SAME_DAY"),
  substitutionPreference: z
    .enum(["BEST_MATCH", "ASK_BEFORE_REPLACE", "NO_SUBSTITUTIONS"])
    .default("BEST_MATCH"),
  paymentMethod: z
    .preprocess((value) => (value === "CASH" ? "COD" : value), z.enum(["COD", "GCASH"]))
    .default("COD"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  placeId: z.string().trim().max(255).optional().nullable(),
  accuracyMeters: z.coerce.number().positive().max(10000).optional().nullable(),
  deliverySlotId: z.coerce.number().int().positive().optional().nullable()
});

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PACKING",
    "READY_FOR_DELIVERY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED"
  ]),
  note: z.string().trim().max(255).optional().nullable()
});

export const substitutionReviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"])
});

export const orderItemParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive()
});

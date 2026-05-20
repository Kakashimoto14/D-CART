import { z } from "zod";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  phone: z
    .string()
    .min(7)
    .max(20)
    .regex(/^[+0-9()\-\s]+$/, "Phone number contains invalid characters."),
  password: z.string().min(8).max(100)
});

export const adminOrderParamSchema = z.object({
  orderId: z.coerce.number().int().positive()
});

export const adminNotificationLogParamSchema = z.object({
  notificationLogId: z.coerce.number().int().positive()
});

export const adminNotificationParamSchema = z.object({
  notificationId: z.string().trim().min(1).max(120)
});

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.string().trim().max(50).optional().default("ALL"),
  range: z.enum(["today", "7d", "30d", "custom"]).optional().default("30d"),
  from: z.string().trim().optional(),
  to: z.string().trim().optional()
});

export const adminSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100)
});

export const updateStoreSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  deliveryRadius: z.coerce.number().positive().max(100),
  baseFee: z.coerce.number().min(0).max(10000),
  perKmFee: z.coerce.number().min(0).max(10000)
});

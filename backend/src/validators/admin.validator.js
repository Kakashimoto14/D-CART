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

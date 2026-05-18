import { z } from "zod";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export const createRiderSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  phone: z
    .string()
    .min(7)
    .max(20)
    .regex(/^[+0-9()\-\s]+$/, "Phone number contains invalid characters."),
  password: z.string().min(8).max(100),
  vehicleType: z.string().min(2).max(50)
});

export const riderIdParamSchema = z.object({
  riderId: z.coerce.number().int().positive()
});

export const assignRiderSchema = z.object({
  riderId: z.number().int().positive()
});

export const dispatchOrderParamSchema = z.object({
  orderId: z.coerce.number().int().positive()
});

export const updateRiderAvailabilitySchema = z.object({
  isAvailable: z.boolean()
});

export const updateRiderLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

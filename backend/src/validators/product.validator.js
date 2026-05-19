import { z } from "zod";

const imageUrlSchema = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), "Image URL must start with http or https.")
  .optional()
  .or(z.literal("").transform(() => null))
  .nullable();

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(5000).optional(),
  image: imageUrlSchema,
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  unit: z.string().min(1).max(20).optional(),
  weight: z.number().positive().optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  categoryId: z.number().int().positive(),
  reorderPoint: z.number().int().nonnegative().optional(),
  reorderQty: z.number().int().nonnegative().optional(),
  safetyStockQty: z.number().int().nonnegative().optional(),
  supplier: z.string().max(150).optional(),
  receivedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  unitCost: z.number().nonnegative().optional().nullable(),
  batchCode: z.string().max(100).optional()
});

export const updateProductSchema = createProductSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  {
    message: "At least one field is required for update."
  }
);

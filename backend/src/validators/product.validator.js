import { z } from "zod";

const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      /^https?:\/\//i.test(value) ||
      /^\/uploads\/products\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(value) ||
      /^\/images\/product-fallbacks\/[a-zA-Z0-9._-]+\.svg$/i.test(value),
    "Image must be an http(s) URL, uploaded product image path, or local product fallback path."
  )
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

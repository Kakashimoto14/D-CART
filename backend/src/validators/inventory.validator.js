import { z } from "zod";

export const inventoryProductIdParamSchema = z.object({
  productId: z.coerce.number().int().positive()
});

export const inventoryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  lowStockOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  nearExpiryOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  expiryDays: z.coerce.number().int().positive().max(365).optional()
});

export const receiveStockSchema = z.object({
  quantity: z.number().int().positive(),
  supplier: z.string().min(2).max(150).optional().nullable(),
  receivedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  unitCost: z.number().nonnegative().optional().nullable(),
  batchCode: z.string().min(3).max(100).optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  reorderQty: z.number().int().nonnegative().optional(),
  safetyStockQty: z.number().int().nonnegative().optional(),
  notes: z.string().max(255).optional().nullable()
});

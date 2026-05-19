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

export const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const categoryListQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false)
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  image: imageUrlSchema,
  isActive: z.boolean().optional().default(true)
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  {
    message: "At least one field is required for update."
  }
);

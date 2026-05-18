import { z } from "zod";

export const fulfillmentOrderParamSchema = z.object({
  orderId: z.coerce.number().int().positive()
});

export const packOrderSchema = z.object({
  stagingLabel: z.string().min(2).max(100),
  stagingZone: z.string().min(1).max(100)
});

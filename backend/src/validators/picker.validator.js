import { z } from "zod";

export const pickerOrderParamSchema = z.object({
  orderId: z.coerce.number().int().positive()
});

export const pickerItemParamSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive()
});

export const pickItemSchema = z.object({
  quantity: z.number().int().positive(),
  scannedBarcode: z.string().max(50).optional().nullable()
});

export const unavailableItemSchema = z.object({
  note: z.string().min(3).max(255)
});

export const substituteItemSchema = z.object({
  substituteProductId: z.number().int().positive(),
  note: z.string().min(3).max(255).optional().nullable()
});

export const pickerNotesSchema = z.object({
  notes: z.string().min(1).max(2000)
});

import { z } from "zod";

export const completeDispatchSchema = z.object({
  recipientName: z.string().min(2).max(100),
  proofNote: z.string().max(255).optional().nullable()
});

export const failDispatchSchema = z.object({
  proofNote: z.string().min(3).max(255)
});

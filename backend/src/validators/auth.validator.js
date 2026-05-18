import { z } from "zod";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  password: z.string().min(8).max(100)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100)
});

export const googleLoginSchema = z.object({
  credential: z.string().min(100).max(4096)
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(255),
  password: z.string().min(8).max(100)
});

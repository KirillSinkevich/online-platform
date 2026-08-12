import { z } from 'zod';

export const registerSchema = z.object({
  token: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createInviteSchema = z.object({
  maxUses: z.number().int().positive().default(1),
  expiresInHours: z.number().int().positive().default(72),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

import { z } from 'zod';

// --- USER ---
export const UserSchema = z.object({
  username: z.string(),
  role: z.string(),
  email: z.string().email().optional(),
  id: z.number().optional(),
  is_staff: z.boolean().optional(),
});
export type User = z.infer<typeof UserSchema>;

// --- AUTH RESPONSE ---
export const AuthResponseSchema = z.object({
  refresh: z.string(),
  access: z.string(),
  role: z.string(),
  username: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// --- REFRESH REQUEST/RESPONSE ---
export const TokenRefreshRequestSchema = z.object({
  refresh: z.string(),
});
export type TokenRefreshRequest = z.infer<typeof TokenRefreshRequestSchema>;

export const TokenRefreshResponseSchema = z.object({
  access: z.string(),
});
export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;
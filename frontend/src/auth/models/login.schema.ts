import { z } from 'zod';

import { type User } from '../../shared/models/auth.schema';

// --- LOGIN CREDENTIALS ---
export const LoginCredentialsSchema = z.object({
  username: z.string().min(1, "El usuario es obligatorio"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isInitialized: boolean;
}

export type AuthAction =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'INITIALIZE'; payload: User | null };
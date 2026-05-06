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

// Esquema local para validación del formulario (basado en el de login)
const passwordValidation = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(30, 'La contraseña es demasiado larga')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial (@, $, !, %, etc.)');

export const loginFormSchema = z.object({
  username: z.string().min(1, 'El usuario es obligatorio'),
  password: passwordValidation,
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenStorage } from './TokenStorage';
import type { AuthResponse } from '../models';

describe('TokenStorage', () => {
  const mockAuthData: AuthResponse = {
    access: 'access-token-123',
    refresh: 'refresh-token-456',
    username: 'test@ejemplo.com',
    role: 'ENOLOGO'
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Importante: Asegurar que empezamos con un estado limpio total
    vi.spyOn(console, 'error').mockImplementation(() => {}); 
  });

  // --- HAPPY PATH ---
  it('debería guardar y recuperar los datos de autenticación correctamente', () => {
    TokenStorage.saveAuthData(mockAuthData);

    expect(TokenStorage.getAccessToken()).toBe(mockAuthData.access);
    expect(TokenStorage.getRefreshToken()).toBe(mockAuthData.refresh);
    
    const user = TokenStorage.getUser();
    expect(user).toEqual({
      username: mockAuthData.username,
      role: mockAuthData.role
    });
  });

  it('debería actualizar solo el access token', () => {
    TokenStorage.saveAuthData(mockAuthData);
    const newToken = 'new-access-token-789';
    TokenStorage.updateAccessToken(newToken);
    
    expect(TokenStorage.getAccessToken()).toBe(newToken);
    expect(TokenStorage.getRefreshToken()).toBe(mockAuthData.refresh);
  });

  it('debería limpiar todos los datos al ejecutar clear()', () => {
    TokenStorage.saveAuthData(mockAuthData);
    TokenStorage.clear();

    expect(TokenStorage.getAccessToken()).toBeNull();
    expect(TokenStorage.getUser()).toBeNull();
  });

  // --- EDGE CASES ---

  it('debería lanzar un error si faltan tokens esenciales al guardar', () => {
    const dataIncompleta = { ...mockAuthData, access: "" };
    
    // Verificamos que nuestra validación de guardado funciona
    expect(() => TokenStorage.saveAuthData(dataIncompleta)).toThrow("Token is empty");
  });

  it('debería manejar JSON corrupto en el usuario devolviendo null y limpiando storage', () => {
    // Inyectamos basura directamente en el localStorage
    localStorage.setItem("user_data", "{ item_incompleto: ");
    
    const result = TokenStorage.getUser();
    
    expect(result).toBeNull();
    // Verificamos que además se haya limpiado el storage corrupto
    expect(localStorage.getItem("user_data")).toBeNull();
  });

  it('debería retornar null si se accede a un storage vacío', () => {
    expect(TokenStorage.getAccessToken()).toBeNull();
    expect(TokenStorage.getUser()).toBeNull();
  });

  it('debería persistir el valor literal guardado aunque sea el string "undefined"', () => {
    // Este test es importante para recordarnos que el Adaptador de Axios 
    // debe validar el contenido, no solo la existencia.
    localStorage.setItem("access_token", "undefined");
    expect(TokenStorage.getAccessToken()).toBe("undefined");
  });
});
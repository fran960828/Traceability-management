import type{ AuthResponse, User } from "../models";

enum StorageKeys {
  ACCESS = "access_token",
  REFRESH = "refresh_token",
  USER = "user_data",
}

export class TokenStorage {
  static saveAuthData(data: AuthResponse): void {
    
    if (!data.access || !data.refresh) {
      throw new Error("Token is empty");
    }
    
    localStorage.setItem(StorageKeys.ACCESS, data.access);
    localStorage.setItem(StorageKeys.REFRESH, data.refresh);
    
    const userData: User = {
      username: data.username,
      role: data.role
    };
    localStorage.setItem(StorageKeys.USER, JSON.stringify(userData));
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(StorageKeys.ACCESS);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(StorageKeys.REFRESH);
  }

  static updateAccessToken(token: string): void {
    localStorage.setItem(StorageKeys.ACCESS, token);
  }

  /**
   * Recupera el usuario con manejo de errores
   */
  static getUser(): User | null {
    const data = localStorage.getItem(StorageKeys.USER);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error("TokenStorage: Error parsing user data", error);
      this.clear(); // Limpiamos la basura para no volver a chocar con ella
      return null;
    }
  }

  static clear(): void {
    Object.values(StorageKeys).forEach(key => localStorage.removeItem(key));
  }
}
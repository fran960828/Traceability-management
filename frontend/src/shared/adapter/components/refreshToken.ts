import axios from 'axios';
import { TokenStorage } from '../../services/TokenStorage';
import type { TokenRefreshResponse } from '../../models';

export const refreshAccessToken = async (baseURL: string): Promise<string> => {
  // 1. Intentamos sacar el refresh token del localStorage que testeamos antes.
  const refreshToken = TokenStorage.getRefreshToken();
  
  // 2. Si no existe, lanzamos error inmediatamente.
  if (!refreshToken) throw new Error("No refresh token available");

  // 3. Hacemos la petición POST a Django. 
  // IMPORTANTE: Usamos 'axios' directamente, no nuestra instancia 'apiClient', 
  // para que esta petición NO pase por los interceptores y no cree un bucle infinito.
  const response = await axios.post<TokenRefreshResponse>(`${baseURL}/token/refresh/`, {
    refresh: refreshToken,
  });

  // 4. Extraemos el nuevo token que nos da SimpleJWT.
  const { access } = response.data;

  if (!access) {
    throw new Error("Invalid refresh response: Access token missing");
  }
  
  // 5. Lo guardamos en el storage para que las futuras peticiones lo tengan.
  TokenStorage.updateAccessToken(access);
  
  // 6. Devolvemos el token para que el orquestador se lo pase a las peticiones en cola.
  return access;
};
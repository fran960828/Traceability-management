import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { TokenStorage } from '../services/TokenStorage';
import { RequestQueue } from './components'
import { refreshAccessToken } from './components';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8009/api/';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false; // Este "semáforo" impide que 10 peticiones 
                          // lancen 10 procesos de refresh a la vez.

apiClient.interceptors.response.use(
  (response) => response, // Si la respuesta es 200, 201, etc., no hacemos nada.
  async (error: AxiosError) => {
    // Capturamos la configuración de la petición o peticiones que acaban de fallar(con configuración me refiero a lo que contiene la peticion).
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si el error NO es 401, o si ya habíamos intentado reintentar esta petición
    // anteriormente, nos rendimos y devolvemos el error al componente.
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // --- CASO A: YA HAY UN REFRESH EN MARCHA ---
    if (isRefreshing) {
      // Creamos una nueva Promesa que se quedará en estado "pending" (pendiente).
      // React dejará esta petición en pausa hasta que llamemos a resolve() o reject().
      return new Promise((resolve, reject) => {
        RequestQueue.add(resolve, reject);
      }).then(token => {
        // Cuando la cola se procese y nos llegue el token, actualizamos la cabecera
        // de esta petición específica y la lanzamos de nuevo.
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    // --- CASO B: SOMOS LA PRIMERA PETICIÓN EN FALLAR ---
    originalRequest._retry = true; // Marcamos para no reintentar infinitamente.
    isRefreshing = true;           // Cerramos el "semáforo" para los demás.

    try {
      // 1. Llamamos al renovador para obtener la nueva llave con la primera petición fallida
      const newAccessToken = await refreshAccessToken(API_URL);
      
      // 2. Avisamos a todas las peticiones que estaban en la cola (Caso A) 
      // de que ya tenemos el token y continuan el flujo del .then dentro del condicional isRefreshing
      RequestQueue.process(null, newAccessToken);
      
      // 3. Actualizamos la cabecera de nuestra propia petición (la primera que ha fallado).
      if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      
      // 4. Reintentamos la petición y devolvemos su resultado.
      return apiClient(originalRequest);
      
    } catch (refreshError) {
      // Si el refresh falla (ej: el refresh token también caducó)...
      RequestQueue.process(refreshError, null); // Cancelamos toda la cola.
      TokenStorage.clear();                     // Limpiamos la sesión.
      window.location.href = '/login';          // ¡Al login!
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false; // Pase lo que pase, abrimos el semáforo al terminar.
    }
  }
);
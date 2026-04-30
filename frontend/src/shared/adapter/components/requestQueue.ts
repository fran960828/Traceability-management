/**
 * Definimos la forma de nuestro objeto de cola.
 * Resolve y Reject son las funciones que controlan el destino de una Promesa en JS.
 */
type QueueItem = {
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
};

/**
 * Nuestra lista de espera en memoria RAM.
 */
let failedQueue: QueueItem[] = [];

/**
 * Objeto orquestador de la cola.
 */
export const RequestQueue = {
  /**
   * Método 'add': Simplemente empuja los controladores de la promesa 
   * a la lista para procesarlos más tarde.
   */
  add(resolve: (token: string | null) => void, reject: (error: any) => void): void {
    failedQueue.push({ resolve, reject });
  },

  /**
   * Método 'process': El "desatascador".
   * Itera, ejecuta el callback correspondiente y vacía la lista.
   */
  process(error: any, token: string | null = null): void {
    failedQueue.forEach((promiseHandlers) => {
      if (error) {
        // Camino del fallo (ej: el refresh token también caducó)
        promiseHandlers.reject(error);
      } else {
        // Camino del éxito (tenemos nueva llave de acceso)
        promiseHandlers.resolve(token);
      }
    });

    // Limpieza: fundamental para no procesar lo mismo dos veces en el futuro
    failedQueue = [];
  }
};
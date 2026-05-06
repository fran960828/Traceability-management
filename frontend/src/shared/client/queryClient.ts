import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evitamos que reintente infinitamente si falla la red (mejor UX)
      retry: 1,
      // Los datos se consideran "viejos" tras 5 minutos
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false, // Evita recargas al cambiar de pestaña
    },
  },
});
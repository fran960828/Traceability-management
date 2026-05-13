// src/shared/hooks/useDataTable.ts
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

interface UseDataTableOptions<T> {
  key: string;
  fetchFn: (filters: any) => Promise<T>;
}

export function useDataTable<T>({ key, fetchFn }: UseDataTableOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 1. Convertimos los parámetros de la URL en un objeto plano para el servicio
  // Ejemplo: ?page=1&name=Ontalba -> { page: "1", name: "Ontalba" }
  const filters = Object.fromEntries(searchParams.entries());

  const query = useQuery({
    queryKey: [key, filters],
    queryFn: () => fetchFn(filters),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Función para actualizar filtros manipulando la URL
  const updateFilters = (newFilters: Record<string, string | number | undefined>) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newFilters };
    
    // Limpiamos filtros vacíos o undefined
    const cleanFilters: Record<string, string> = {};
    Object.keys(merged).forEach(k => {
      if (merged[k] !== undefined && merged[k] !== '') {
        cleanFilters[k] = String(merged[k]);
      }
    });

    setSearchParams(cleanFilters);
  };

  return {
    ...query,
    filters,       // Filtros actuales (leídos de la URL)
    updateFilters, // Función para cambiar filtros
  };
}
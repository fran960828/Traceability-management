import { useMutation} from '@tanstack/react-query';
import { queryClient } from '../client';


interface UseDataMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: string[]; // Qué queries queremos refrescar (ej: ['suppliers'])
  onSuccess?: (data: TData) => void;
  onError?: (error: any) => void;
}

export function useDataMutation<TData, TVariables>({
  mutationFn,
  invalidateKeys,
  onSuccess,
  onError
}: UseDataMutationOptions<TData, TVariables>) {

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      // Si pasamos llaves, invalidamos automáticamente las queries relacionadas
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      // Aquí podrías centralizar un sistema de notificaciones (Toasts)
      console.error('Mutation Error:', error);
      if (onError) onError(error);
    }
  });
}
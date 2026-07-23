import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  terraVozService,
  ProcessTerraVozParams,
  isTransientTerraVozError,
  getTerraVozErrorMessage,
} from '../services/terra-voz.service';

export const useTerraVoz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ProcessTerraVozParams) => terraVozService.process(params),
    // Capa extra: React Query reintenta si el service agotó reintentos y el error sigue siendo transitorio
    retry: (failureCount, error) =>
      failureCount < 1 && isTransientTerraVozError(error),
    retryDelay: 1500,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
    meta: {
      errorMessage: 'No se pudo completar Terra Voz',
    },
  });
};

export { getTerraVozErrorMessage };

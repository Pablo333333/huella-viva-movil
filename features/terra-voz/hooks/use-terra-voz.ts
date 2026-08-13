import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  terraVozService,
  ProcessTerraVozParams,
  ConfirmTerraVozParams,
  TerraVozResponse,
  isTransientTerraVozError,
  getTerraVozErrorMessage,
} from '../services/terra-voz.service';
import { useAuth } from '@/features/auth/context/AuthProvider';

export const useTerraVoz = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  const preview = useMutation({
    mutationFn: (params: ProcessTerraVozParams) => terraVozService.preview(params),
    retry: (failureCount, error) =>
      failureCount < 1 && isTransientTerraVozError(error),
    retryDelay: 800,
  });

  const confirm = useMutation({
    mutationFn: (params: ConfirmTerraVozParams) => terraVozService.confirm(params),
    onSuccess: async (result: TerraVozResponse) => {
      const nextCommunityId = result.communityId || result.activity?.communityId;
      if (nextCommunityId) {
        await updateUser({ communityId: nextCommunityId });
      }
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
    meta: {
      errorMessage: 'No se pudo confirmar Terra Voz',
    },
  });

  return { preview, confirm };
};

export { getTerraVozErrorMessage };

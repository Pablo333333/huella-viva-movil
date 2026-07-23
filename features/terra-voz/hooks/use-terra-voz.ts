import { useMutation, useQueryClient } from '@tanstack/react-query';
import { terraVozService, ProcessTerraVozParams } from '../services/terra-voz.service';

export const useTerraVoz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ProcessTerraVozParams) => terraVozService.process(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
};

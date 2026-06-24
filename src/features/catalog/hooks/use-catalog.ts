import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../services/catalog.service';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: catalogService.getCategories,
  });
};

export const useWorkflowStates = () => {
  return useQuery({
    queryKey: ['workflow-states'],
    queryFn: catalogService.getWorkflowStates,
  });
};

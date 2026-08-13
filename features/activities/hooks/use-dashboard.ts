import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';

export const useDashboardMetrics = (filters?: {
  communityId?: string;
  userId?: string;
}) => {
  return useQuery({
    queryKey: ['dashboard', 'metrics', filters],
    queryFn: () => dashboardService.getMetrics(filters),
    refetchInterval: 30000,
  });
};

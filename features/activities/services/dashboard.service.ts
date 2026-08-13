import api from '@/lib/api';
import { DashboardMetrics } from '../types';

export const dashboardService = {
  getMetrics: async (filters?: {
    communityId?: string;
    userId?: string;
  }): Promise<DashboardMetrics> => {
    const response = await api.get('/dashboard/metrics', { params: filters });
    return response.data;
  },
};

import api from '@/lib/api';
import { Activity } from '../types';

export const activitiesService = {
  getAll: async (filters?: { communityId?: string; type?: string }): Promise<Activity[]> => {
    const response = await api.get('/activities', { params: filters });
    return response.data;
  },
  
  getByCommunity: async (communityId: string): Promise<Activity[]> => {
    const response = await api.get(`/activities/community/${communityId}`);
    return response.data;
  },

  getTimeline: async (communityId: string): Promise<Activity[]> => {
    const response = await api.get(`/activities/timeline/${communityId}`);
    return response.data;
  },

  getById: async (id: string): Promise<Activity> => {
    const response = await api.get(`/activities/${id}`);
    return response.data;
  },
};

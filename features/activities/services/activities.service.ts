import api from '@/lib/api';
import { Activity, ActivityStatus, Commitment, CommitmentStatus } from '../types';

export const activitiesService = {
  getAll: async (filters?: {
    communityId?: string;
    type?: string;
    userId?: string;
    estado?: string;
  }): Promise<Activity[]> => {
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

  updateEstado: async (id: string, estado: ActivityStatus): Promise<Activity> => {
    const response = await api.patch(`/activities/${id}/estado`, { estado });
    return response.data;
  },

  updateCommitmentEstado: async (
    activityId: string,
    commitmentId: string,
    estado: CommitmentStatus,
  ): Promise<Commitment> => {
    const response = await api.patch(
      `/activities/${activityId}/commitments/${commitmentId}/estado`,
      { estado },
    );
    return response.data;
  },
};

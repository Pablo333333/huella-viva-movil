import api from '@/lib/api';

export interface Community {
  id: string;
  nombre: string;
  poblacion: number;
  location?: number | null;
  boundary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const communitiesService = {
  getAll: async (): Promise<Community[]> => {
    const response = await api.get('/communities');
    return response.data;
  },

  getById: async (id: string): Promise<Community> => {
    const response = await api.get(`/communities/${id}`);
    return response.data;
  },
};

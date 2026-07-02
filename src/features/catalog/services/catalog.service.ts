import api from '@/lib/api';

export interface CategoryResponse {
  id: string;
  name: string;
  description?: string;
}

export interface WorkflowStateResponse {
  id: string;
  name: string;
  description?: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const catalogService = {
  getCategories: async (): Promise<CategoryResponse[]> => {
    const response = await api.get<CategoryResponse[]>('/catalog/categories');
    return response.data;
  },
  getWorkflowStates: async (): Promise<WorkflowStateResponse[]> => {
    const response = await api.get<WorkflowStateResponse[]>('/catalog/workflow-states');
    return response.data;
  },
  getUsers: async (): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>('/catalog/users');
    return response.data;
  },
};

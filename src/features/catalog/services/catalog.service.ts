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

export const catalogService = {
  getCategories: async (): Promise<CategoryResponse[]> => {
    const response = await api.get<CategoryResponse[]>('/catalog/categories');
    return response.data;
  },
  getWorkflowStates: async (): Promise<WorkflowStateResponse[]> => {
    const response = await api.get<WorkflowStateResponse[]>('/catalog/workflow-states');
    return response.data;
  },
};

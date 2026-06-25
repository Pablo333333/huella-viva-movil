import api from '@/lib/api';
import { OfflineRepository } from '@/lib/offline-repository';

export interface TicketResponse {
  id: string;
  title: string;
  description?: string;
  statusName: string;
  categoryName: string;
  createdAt: string;
}

export const ticketsService = {
  findAll: async (): Promise<TicketResponse[]> => {
    const response = await api.get<TicketResponse[]>('/tickets');
    return response.data;
  },
  findById: async (id: string): Promise<TicketResponse> => {
    const response = await api.get<TicketResponse>(`/tickets/${id}`);
    return response.data;
  },
  changeStatus: async (id: string, newStateId: string): Promise<void | { offline: boolean }> => {
    return OfflineRepository.executeAction(
      'STATUS_CHANGE',
      'Ticket',
      id,
      { newStateId },
      async () => {
        await api.patch(`/tickets/${id}/status`, { newStateId });
      }
    );
  },
  getComments: async (id: string): Promise<any[]> => {
    const response = await api.get(`/tickets/${id}/comments`);
    return response.data;
  },
  createComment: async (id: string, content: string): Promise<any> => {
    const response = await api.post(`/tickets/${id}/comments`, { content });
    return response.data;
  },
  getDocuments: async (id: string): Promise<any[]> => {
    const response = await api.get(`/tickets/${id}/documents`);
    return response.data;
  },
  uploadDocument: async (id: string, fileUri: string, fileName: string, fileType: string): Promise<any> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });
    const response = await api.post(`/tickets/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getHistory: async (id: string): Promise<any[]> => {
    const response = await api.get(`/tickets/${id}/history`);
    return response.data;
  },
  summarize: async (id: string): Promise<{ summary: string }> => {
    const response = await api.post<{ summary: string }>(`/tickets/${id}/summarize`);
    return response.data;
  },
};

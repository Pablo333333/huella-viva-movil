import api from '@/lib/api';
import { OfflineRepository } from '@/lib/offline-repository';

export enum TramiteType {
  SOLICITUD = 'SOLICITUD',
  CARTA = 'CARTA',
  OFICIO = 'OFICIO',
  INFORME = 'INFORME',
}

export interface TramiteResponse {
  id: string;
  tipo: TramiteType;
  remitenteId: string;
  destinatarioId: string;
  estadoId: string;
  fechaLimite?: string;
  createdAt: string;
  updatedAt: string;
  remitenteName?: string;
  destinatarioName?: string;
  estadoName?: string;
}

export interface CreateTramiteDto {
  tipo: TramiteType;
  destinatarioId: string;
  estadoId: string;
  fechaLimite?: string;
}

export const tramitesService = {
  create: async (data: CreateTramiteDto): Promise<TramiteResponse | { offline: boolean }> => {
    return OfflineRepository.executeAction(
      'CREATE',
      'Tramite',
      null,
      data,
      async () => {
        const response = await api.post<TramiteResponse>('/tramites', data);
        return response.data;
      }
    );
  },
  findAll: async (): Promise<TramiteResponse[]> => {
    const response = await api.get<TramiteResponse[]>('/tramites');
    return response.data;
  },
  findById: async (id: string): Promise<TramiteResponse> => {
    const response = await api.get<TramiteResponse>(`/tramites/${id}`);
    return response.data;
  },
  changeStatus: async (id: string, newStateId: string): Promise<void | { offline: boolean }> => {
    return OfflineRepository.executeAction(
      'STATUS_CHANGE',
      'Tramite',
      id,
      { newStateId },
      async () => {
        await api.patch(`/tramites/${id}/status`, { newStateId });
      }
    );
  },
  uploadDocument: async (id: string, fileUri: string, fileName: string, fileType: string): Promise<any> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });
    const response = await api.post(`/tramites/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getDocuments: async (id: string): Promise<any[]> => {
    const response = await api.get(`/tramites/${id}/documents`);
    return response.data;
  },
  getComments: async (id: string): Promise<any[]> => {
    const response = await api.get(`/tramites/${id}/comments`);
    return response.data;
  },
  createComment: async (id: string, content: string): Promise<any> => {
    const response = await api.post(`/tramites/${id}/comments`, { content });
    return response.data;
  },
  summarize: async (id: string): Promise<{ summary: string }> => {
    const response = await api.get<{ summary: string }>(`/tramites/${id}/summary`);
    return response.data;
  },
  analyzeImage: async (fileUri: string, fileName: string, fileType: string): Promise<any> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });
    const response = await api.post('/tramites/analyze-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

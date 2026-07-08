import api from '@/lib/api';
import { OfflineRepository } from '@/lib/offline-repository';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// En la API legacy de expo-file-system, el enum está disponible
const UploadTypeMultipart = FileSystem.FileSystemUploadType?.MULTIPART ?? 1;

export enum TicketType {
  SOLICITUD = 'SOLICITUD',
  CARTA = 'CARTA',
  OFICIO = 'OFICIO',
  INFORME = 'INFORME',
}

export interface TicketResponse {
  id: string;
  title?: string;
  description?: string;
  type?: TicketType;
  workflowStateId?: string;
  workflowState?: {
    id: string;
    name: string;
  };
  statusId?: string; // Mantener por retrocompatibilidad temporal
  statusName?: string; // Ahora opcional por si el backend no lo mapea
  categoryName?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt?: string;
  remitenteName?: string;
  destinatarioName?: string;
}

export interface CreateTicketDto {
  title?: string;
  description?: string;
  type?: TicketType;
  destinatarioId?: string;
  categoryId?: string;
  workflowStateId?: string;
  statusId?: string; // Mantener por retrocompatibilidad temporal
  fechaLimite?: string;
  audioFile?: {
    uri: string;
    name: string;
    type: string;
  };
}

export const ticketsService = {
  create: async (data: CreateTicketDto): Promise<TicketResponse | { offline: boolean }> => {
    return OfflineRepository.executeAction(
      'CREATE',
      'Ticket',
      null,
      data,
      async () => {
        if (data.audioFile) {
          const token = await SecureStore.getItemAsync('token');
          const baseUrl = api.defaults.baseURL;
          const url = `${baseUrl}/tickets`;

          console.log('[FileSystem] Subiendo ticket con audio via uploadAsync:', url);

          const response = await FileSystem.uploadAsync(url, data.audioFile.uri, {
            httpMethod: 'POST',
            uploadType: UploadTypeMultipart,
            fieldName: 'audio',
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'Accept': 'application/json',
            },
            parameters: {
              title: data.title || '',
              description: data.description || '',
              categoryId: data.categoryId || '',
              workflowStateId: data.workflowStateId || '',
              ...(data.type ? { type: data.type } : {}),
              ...(data.destinatarioId ? { destinatarioId: data.destinatarioId } : {}),
            },
          });

          if (response.status < 200 || response.status >= 300) {
            console.error('[FileSystem Error]', response.body);
            throw new Error(response.body);
          }

          return JSON.parse(response.body);
        }

        console.log('[API] Creando ticket con JSON. Payload:', JSON.stringify(data, null, 2));
        const response = await api.post<TicketResponse>('/tickets', data);
        return response.data;
      }
    );
  },
  findAll: async (): Promise<TicketResponse[]> => {
    try {
      console.log(`[API] Cargando tickets desde: ${api.defaults.baseURL}/tickets`);
      const response = await api.get<TicketResponse[]>('/tickets');
      
      // LOG CRUDO PARA INSPECCIÓN - NO ELIMINAR HASTA CONFIRMAR ESTRUCTURA
      console.log('[API RAW] Estructura cruda de la respuesta:', JSON.stringify(response.data, null, 2));
      if (response.data && response.data.length > 0) {
        console.log('[API RAW] Primer item crudo:', JSON.stringify(response.data[0], null, 2));
        console.log('[API RAW] Keys del primer item:', Object.keys(response.data[0]));
      }
      
      console.log(`[API] Tickets cargados: ${response.data?.length || 0} items`);
      return response.data;
    } catch (error: any) {
      console.error('[API Error] Error al cargar tickets:', error.response?.status, error.message);
      throw error;
    }
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
  analyzeImage: async (fileUri: string, fileName: string, fileType: string): Promise<any> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });
    const response = await api.post('/tickets/analyze-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

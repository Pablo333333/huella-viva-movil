import api from '@/lib/api';
import { Activity } from '@/features/activities/types';

export interface ProcessTerraVozParams {
  text?: string;
  audioUri?: string;
  communityId?: string;
  userId: string;
}

export interface TerraVozResponse {
  activity: Activity;
  commitmentsCreated: number;
  communityName?: string;
  transcript: string;
  message: string;
}

export const terraVozService = {
  process: async (params: ProcessTerraVozParams): Promise<TerraVozResponse> => {
    const formData = new FormData();

    if (params.text) {
      formData.append('text', params.text);
    }

    if (params.audioUri) {
      const filename = params.audioUri.split('/').pop() || 'audio.m4a';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'm4a';
      const type =
        ext === 'mp3'
          ? 'audio/mpeg'
          : ext === 'wav'
            ? 'audio/wav'
            : ext === 'webm'
              ? 'audio/webm'
              : 'audio/m4a';

      formData.append('audio', {
        uri: params.audioUri,
        name: filename.includes('.') ? filename : `recording.${ext}`,
        type,
      } as unknown as Blob);
    }

    if (params.communityId) {
      formData.append('communityId', params.communityId);
    }
    formData.append('userId', params.userId);

    const response = await api.post('/activities/terra-voz', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });

    return response.data;
  },
};

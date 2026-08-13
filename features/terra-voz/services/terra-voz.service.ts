import api from '@/lib/api';
import { Activity, ActivityStatus, ActivityType } from '@/features/activities/types';
import { isAxiosError } from 'axios';

export interface ProcessTerraVozParams {
  text?: string;
  audioUri?: string;
  communityId?: string;
  gpsPlaceName?: string;
  userId: string;
  latitude?: number;
  longitude?: number;
}

export interface TerraVozCommitmentPreview {
  descripcion: string;
  responsable?: string;
  fecha_cumplimiento?: string;
}

export interface TerraVozPreviewResponse {
  transcript: string;
  parsed: {
    tipo: ActivityType;
    descripcion: string;
    fecha: string;
    estado: ActivityStatus;
    comunidadNombre?: string | null;
    commitments: TerraVozCommitmentPreview[];
  };
  ubicacionTexto: string;
  communitySource: 'name' | 'gps' | 'transcript' | 'none';
  validation: { complete: boolean; issues: string[] };
  latitude?: number | null;
  longitude?: number | null;
}

export interface ConfirmTerraVozParams {
  transcript: string;
  tipo: ActivityType;
  descripcion: string;
  fecha: string;
  estado: ActivityStatus;
  comunidadNombre: string;
  userId: string;
  latitude?: number;
  longitude?: number;
  commitments?: TerraVozCommitmentPreview[];
}

export interface TerraVozResponse {
  activity: Activity;
  commitmentsCreated: number;
  communityId?: string;
  communityName?: string;
  transcript: string;
  message: string;
}

export const TERRA_VOZ_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientTerraVozError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.code === 'ECONNABORTED') return true;
  if (error.code === 'ERR_NETWORK') return true;
  if (!error.response) return true;
  const status = error.response.status;
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

export function getTerraVozErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'La IA tardó demasiado en responder. Revisa la conexión e inténtalo de nuevo.';
    }
    if (!error.response || error.code === 'ERR_NETWORK') {
      return 'No hay conexión con el servidor. Verifica la red e inténtalo otra vez.';
    }
    const data = error.response.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : String(data.message);
    }
    return `Error del servidor (${error.response.status}). Inténtalo de nuevo.`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'No se pudo procesar Terra Voz. Inténtalo de nuevo.';
}

function buildFormData(params: ProcessTerraVozParams): FormData {
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
  if (params.gpsPlaceName) {
    formData.append('gpsPlaceName', params.gpsPlaceName);
  }
  formData.append('userId', params.userId);

  if (
    typeof params.latitude === 'number' &&
    typeof params.longitude === 'number' &&
    Number.isFinite(params.latitude) &&
    Number.isFinite(params.longitude)
  ) {
    formData.append('latitude', String(params.latitude));
    formData.append('longitude', String(params.longitude));
  }

  return formData;
}

async function postPreviewOnce(
  params: ProcessTerraVozParams,
): Promise<TerraVozPreviewResponse> {
  const formData = buildFormData(params);
  const response = await api.post('/activities/terra-voz/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
    },
    timeout: TERRA_VOZ_TIMEOUT_MS,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return response.data;
}

export const terraVozService = {
  preview: async (params: ProcessTerraVozParams): Promise<TerraVozPreviewResponse> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await postPreviewOnce(params);
      } catch (error) {
        lastError = error;
        const canRetry = attempt < MAX_ATTEMPTS && isTransientTerraVozError(error);
        console.warn(
          `[TerraVoz] Preview ${attempt}/${MAX_ATTEMPTS} falló`,
          isAxiosError(error)
            ? { code: error.code, status: error.response?.status }
            : error,
        );
        if (!canRetry) {
          throw Object.assign(
            error instanceof Error ? error : new Error(getTerraVozErrorMessage(error)),
            { friendlyMessage: getTerraVozErrorMessage(error) },
          );
        }
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    }

    throw Object.assign(
      lastError instanceof Error
        ? lastError
        : new Error(getTerraVozErrorMessage(lastError)),
      { friendlyMessage: getTerraVozErrorMessage(lastError) },
    );
  },

  confirm: async (params: ConfirmTerraVozParams): Promise<TerraVozResponse> => {
    try {
      const response = await api.post('/activities/terra-voz/confirm', params, {
        timeout: 30_000,
      });
      return response.data;
    } catch (error) {
      throw Object.assign(
        error instanceof Error ? error : new Error(getTerraVozErrorMessage(error)),
        { friendlyMessage: getTerraVozErrorMessage(error) },
      );
    }
  },
};

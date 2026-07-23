export type ActivityType = 'REUNION' | 'INSPECCION' | 'VISITA' | 'TALLER' | 'OTRO';
export type CommitmentStatus = 'PROGRAMADO' | 'EN_PROCESO' | 'CUMPLIDO';

export interface Commitment {
  id: string;
  descripcion: string;
  responsable: string;
  fecha_cumplimiento?: string | null;
  estado: CommitmentStatus;
  activityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  tipo: ActivityType;
  descripcion: string;
  fecha: string;
  audioUrl?: string | null;
  fotoUrl?: string | null;
  location?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  userId: string;
  communityId: string;
  commitments?: Commitment[];
  createdAt: string;
  updatedAt: string;
}

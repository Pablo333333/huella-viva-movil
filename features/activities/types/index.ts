export type ActivityType = 'REUNION' | 'INSPECCION' | 'VISITA' | 'TALLER' | 'OTRO';
export type ActivityStatus = 'PROGRAMADA' | 'EJECUTADA';
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
  estado: ActivityStatus;
  audioUrl?: string | null;
  fotoUrl?: string | null;
  location?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  userId: string;
  communityId: string;
  communityName?: string;
  commitments?: Commitment[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardKpis {
  totalActivities: number;
  programadasCount: number;
  ejecutadasCount: number;
  totalCommunities: number;
  activeCommunities: number;
  totalCommitments: number;
  fulfilledCommitments: number;
  hitos: number;
  confidenceIndex: number;
}

export interface DashboardMetrics {
  kpis: DashboardKpis;
  distribution: { name: string; value: number }[];
  recentActivitiesCount: number;
}

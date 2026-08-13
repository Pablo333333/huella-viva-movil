import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { activitiesService } from '../services/activities.service';
import { ActivityStatus, CommitmentStatus } from '../types';

export const useActivities = (filters?: {
  communityId?: string;
  type?: string;
  userId?: string;
  estado?: string;
}) => {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () => activitiesService.getAll(filters),
  });
};

export const useCommunityTimeline = (communityId: string) => {
  return useQuery({
    queryKey: ['activities', 'timeline', communityId],
    queryFn: () => activitiesService.getTimeline(communityId),
    enabled: !!communityId,
  });
};

export const useActivity = (id: string) => {
  return useQuery({
    queryKey: ['activities', id],
    queryFn: () => activitiesService.getById(id),
    enabled: !!id,
  });
};

export const useUpdateActivityEstado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: ActivityStatus }) =>
      activitiesService.updateEstado(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateCommitmentEstado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      activityId,
      commitmentId,
      estado,
    }: {
      activityId: string;
      commitmentId: string;
      estado: CommitmentStatus;
    }) => activitiesService.updateCommitmentEstado(activityId, commitmentId, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

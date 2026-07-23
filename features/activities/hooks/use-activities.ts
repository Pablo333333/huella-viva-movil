import { useQuery } from '@tanstack/react-query';
import { activitiesService } from '../services/activities.service';

export const useActivities = (filters?: { communityId?: string; type?: string }) => {
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

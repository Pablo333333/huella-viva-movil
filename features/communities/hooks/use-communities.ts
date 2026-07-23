import { useQuery } from '@tanstack/react-query';
import { communitiesService } from '../services/communities.service';

export const useCommunities = () => {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => communitiesService.getAll(),
  });
};

/** Comunidad por defecto para demos de Terra Voz (primera del seed). */
export const useDefaultCommunity = () => {
  const query = useCommunities();
  const community = query.data?.[0] ?? null;
  return {
    ...query,
    community,
    communityId: community?.id,
  };
};

import { useQuery } from '@tanstack/react-query';
import { communitiesService } from '../services/communities.service';
import { useAuth } from '@/features/auth/context/AuthProvider';

export const useCommunities = () => {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => communitiesService.getAll(),
  });
};

/** Comunidad asignada al usuario (sin caer al primer ítem del catálogo). */
export const useUserCommunity = () => {
  const { user } = useAuth();
  const query = useCommunities();
  const assigned =
    query.data?.find((c) => c.id === user?.communityId) ?? null;

  return {
    ...query,
    community: assigned,
    communityId: user?.communityId ?? assigned?.id,
  };
};

/** @deprecated Usar useUserCommunity. */
export const useDefaultCommunity = useUserCommunity;

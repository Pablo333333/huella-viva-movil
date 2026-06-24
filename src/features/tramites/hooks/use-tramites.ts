import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tramitesService, CreateTramiteDto } from '../services/tramites.service';

export const useTramites = () => {
  return useQuery({
    queryKey: ['tramites'],
    queryFn: tramitesService.findAll,
  });
};

export const useTramite = (id: string) => {
  return useQuery({
    queryKey: ['tramites', id],
    queryFn: () => tramitesService.findById(id),
    enabled: !!id,
  });
};

export const useCreateTramite = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTramiteDto) => tramitesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tramites'] });
      options?.onSuccess?.();
    },
  });
};

export const useTramiteComments = (id: string) => {
  return useQuery({
    queryKey: ['tramites', id, 'comments'],
    queryFn: () => tramitesService.getComments(id),
    enabled: !!id,
  });
};

export const useCreateTramiteComment = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => tramitesService.createComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tramites', id, 'comments'] });
    },
  });
};

export const useTramiteDocuments = (id: string) => {
  return useQuery({
    queryKey: ['tramites', id, 'documents'],
    queryFn: () => tramitesService.getDocuments(id),
    enabled: !!id,
  });
};

export const useUploadTramiteDocument = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, name, type }: { uri: string; name: string; type: string }) => 
      tramitesService.uploadDocument(id, uri, name, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tramites', id, 'documents'] });
    },
  });
};

export const useSummarizeTramite = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tramitesService.summarize(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['tramites', id, 'summary'], data.summary);
    },
  });
};

export const useAnalyzeTramiteImage = () => {
  return useMutation({
    mutationFn: ({ uri, name, type }: { uri: string; name: string; type: string }) => 
      tramitesService.analyzeImage(uri, name, type),
  });
};

export const useTramiteSummary = (id: string) => {
  return useQuery({
    queryKey: ['tramites', id, 'summary'],
    queryFn: () => null,
    enabled: false,
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsService, CreateTicketDto } from '../services/tickets.service';

export const useTickets = () => {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: ticketsService.findAll,
  });
};

export const useTicket = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () => ticketsService.findById(id),
    enabled: !!id,
  });
};

export const useCreateTicket = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketDto) => ticketsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      options?.onSuccess?.();
    },
  });
};

export const useTicketComments = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id, 'comments'],
    queryFn: () => ticketsService.getComments(id),
    enabled: !!id,
  });
};

export const useCreateTicketComment = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => ticketsService.createComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', id, 'comments'] });
    },
  });
};

export const useTicketDocuments = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id, 'documents'],
    queryFn: () => ticketsService.getDocuments(id),
    enabled: !!id,
  });
};

export const useUploadTicketDocument = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, name, type }: { uri: string; name: string; type: string }) => 
      ticketsService.uploadDocument(id, uri, name, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', id, 'documents'] });
    },
  });
};

export const useTicketHistory = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id, 'history'],
    queryFn: () => ticketsService.getHistory(id),
    enabled: !!id,
  });
};

export const useSummarizeTicket = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ticketsService.summarize(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['tickets', id, 'summary'], data.summary);
    },
  });
};

export const useAnalyzeTicketImage = () => {
  return useMutation({
    mutationFn: ({ uri, name, type }: { uri: string; name: string; type: string }) => 
      ticketsService.analyzeImage(uri, name, type),
  });
};

export const useTicketSummary = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id, 'summary'],
    queryFn: () => null,
    enabled: false,
  });
};

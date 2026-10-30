import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { busesApi, CreateBusInput, LayoutPayload } from '../api';

export function useBuses() {
  return useQuery({ queryKey: ['buses'], queryFn: busesApi.list });
}

export function useBus(id: string) {
  return useQuery({ queryKey: ['bus', id], queryFn: () => busesApi.get(id), enabled: !!id });
}

export function useBusLayout(id: string) {
  return useQuery({ queryKey: ['bus', id, 'layout'], queryFn: () => busesApi.getLayout(id), enabled: !!id });
}

export function useCreateBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBusInput) => busesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      // Real status: dashboard fleet counter must update
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'operator'] });
    },
  });
}

export function useUpdateLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LayoutPayload }) => busesApi.updateLayout(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bus', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bus', variables.id, 'layout'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'operator'] });
    },
  });
}
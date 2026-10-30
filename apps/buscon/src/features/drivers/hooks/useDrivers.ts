import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi, InviteDriverInput } from '../api';

export function useDrivers() {
  return useQuery({ queryKey: ['drivers'], queryFn: driversApi.list });
}

export function useInviteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteDriverInput) => driversApi.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      // Real status: dashboard driver counter must update
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'operator'] });
    },
  });
}

export function useRemoveDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => driversApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'operator'] });
    },
  });
}
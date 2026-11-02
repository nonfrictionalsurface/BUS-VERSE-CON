import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminDriversApi } from '../api';

export function useAllDrivers() {
  return useQuery({
    queryKey: ['admin', 'drivers', 'all'],
    queryFn: adminDriversApi.listAll,
    refetchInterval: 20_000,
  });
}

export function useApproveDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDriversApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'drivers', 'all'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useRejectDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminDriversApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'drivers', 'all'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}
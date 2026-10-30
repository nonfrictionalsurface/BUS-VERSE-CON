import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminOperatorsApi } from '../api';

export function useAdminOperators() {
  return useQuery({ queryKey: ['admin', 'operators'], queryFn: adminOperatorsApi.list });
}

export function useSuspendOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminOperatorsApi.suspend(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'operators'] }),
  });
}

export function useUnsuspendOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminOperatorsApi.unsuspend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'operators'] }),
  });
}
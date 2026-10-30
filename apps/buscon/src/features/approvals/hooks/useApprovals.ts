import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from '../api';

export function usePendingOperators() {
  return useQuery({ queryKey: ['admin', 'approvals', 'operators'], queryFn: approvalsApi.listOperators, refetchInterval: 20_000 });
}

export function usePendingBuses() {
  return useQuery({ queryKey: ['admin', 'approvals', 'buses'], queryFn: approvalsApi.listBuses, refetchInterval: 20_000 });
}

export function usePendingRoutes() {
  return useQuery({ queryKey: ['admin', 'approvals', 'routes'], queryFn: approvalsApi.listRoutes, refetchInterval: 20_000 });
}

export function usePendingSchedules() {
  return useQuery({ queryKey: ['admin', 'approvals', 'schedules'], queryFn: approvalsApi.listSchedules, refetchInterval: 20_000 });
}

export function useApproveOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalsApi.approveOperator(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals', 'operators'] });
      qc.invalidateQueries({ queryKey: ['admin', 'operators'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
  });
}

export function useRejectOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => approvalsApi.rejectOperator(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals', 'operators'] });
      qc.invalidateQueries({ queryKey: ['admin', 'operators'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
  });
}

export function useApproveBus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalsApi.approveBus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals', 'buses'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
  });
}

export function useRejectBus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => approvalsApi.rejectBus(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals', 'buses'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
  });
}

export function useApproveRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalsApi.approveRoute(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals', 'routes'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
  });
}

export function useApproveSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalsApi.approveSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals', 'schedules'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
  });
}
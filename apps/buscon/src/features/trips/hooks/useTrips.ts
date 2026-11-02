import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsApi, AssignDriverInput } from '../api';

export function useTrips(_opts?: { limit?: number }) {
  return useQuery({
    queryKey: ['trips'],
    queryFn: tripsApi.list,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useAssignDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignDriverInput) => tripsApi.assign(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useReassignDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ existingTripId, input }: { existingTripId: string; input: AssignDriverInput }) => {
      try { await tripsApi.unassign(existingTripId); } catch { /* ignore — assign will re-create */ }
      return tripsApi.assign(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUnassignTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.unassign(tripId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, CreateScheduleInput } from '../api';

export function useSchedules() {
  return useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleInput) => schedulesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

export function usePublishSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulesApi.publish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}
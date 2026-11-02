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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[delete] firing DELETE for', id);
      const result = await schedulesApi.delete(id);
      console.log('[delete] DELETE response:', result);
      return result;
    },
    onMutate: async (id: string) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['schedules'] });

      const previous = queryClient.getQueryData<any[]>(['schedules']);
      console.log('[delete] previous schedule count:', previous?.length);

      // Optimistically remove the row from the cache
      queryClient.setQueryData<any[]>(['schedules'], (old) =>
        old ? old.filter((s) => s.id !== id) : old
      );

      return { previous };
    },
    onError: (err: any, id: string, context: any) => {
      console.error('[delete] DELETE failed:', err?.code, err?.message, err);
      // Restore the previous list on failure
      if (context?.previous) {
        queryClient.setQueryData(['schedules'], context.previous);
      }
    },
    onSuccess: async (_, id: string) => {
      // Wait a moment so the DELETE transaction commits before we refetch
      await new Promise((r) => setTimeout(r, 250));

      const fresh = await queryClient.fetchQuery({
        queryKey: ['schedules'],
        queryFn: schedulesApi.list,
        staleTime: 0,
      });

      const stillThere = (fresh as any[]).some((s: any) => s.id === id);
      if (stillThere) {
        console.warn('[delete] schedule STILL present after delete — backend not filtering:', id);
        // Show a toast-like error via console for visibility
        // The row will reappear because refetch returned it — this is a backend issue
      } else {
        console.log('[delete] confirmed removed:', id);
      }
    },
  });
}

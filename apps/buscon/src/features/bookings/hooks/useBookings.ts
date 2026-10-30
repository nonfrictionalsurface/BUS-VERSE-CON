import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '../api';

export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.list,
    refetchInterval: 30_000, // Poll every 30s for new bookings
  });
}
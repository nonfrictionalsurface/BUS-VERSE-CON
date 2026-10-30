import { useQuery } from '@tanstack/react-query';
import { adminBookingsApi } from '../api';

export function useAdminBookings() {
  return useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: adminBookingsApi.list,
    refetchInterval: 30_000,
  });
}
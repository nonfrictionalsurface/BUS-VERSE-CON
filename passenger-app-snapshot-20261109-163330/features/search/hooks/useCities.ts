import { useQuery } from '@tanstack/react-query';
import { listCities } from '../api/cities.api';

export function useCities(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['cities', trimmed],
    queryFn: () => listCities({ q: trimmed, limit: 30 }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
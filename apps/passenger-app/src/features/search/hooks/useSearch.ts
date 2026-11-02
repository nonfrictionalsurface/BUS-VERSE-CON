import { useQuery } from '@tanstack/react-query';
import { searchSchedules, type SearchParams } from '../api/search.api';

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: [
      'search',
      params.originCityId,
      params.destinationCityId,
      params.date,
      params.sortBy ?? 'departureTime',
    ],
    queryFn: () => searchSchedules(params),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}